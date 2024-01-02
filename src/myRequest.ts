import message from 'antd/lib/message';
import notification from 'antd/lib/notification';
import { extend } from 'umi-request';
//导入 umi-request-progress,解决umi-request不支持上传文件进度条的问题
import progressMiddleware from 'umi-request-progress';
const JSONbig = require('json-bigint');

// const controller = new AbortController();
// const { signal } = controller;
// signal.addEventListener('abort',()=>{

// });

const myRequest = extend({
    // timeout: 60000,
    timeoutMessage: "请求超时请重试",
    headers: {
        // 'Content-Type': 'multipart/form-data',
        'Authorization': '',
    },
    throwErrIfParseFail: true,
    getResponse: false,//最终结果中不返回response信息
    // errorHandler: (error) => {
    //     return {};
    // }
});

const refreshTokenReqeust = extend({
    // timeout: 60000,
    timeoutMessage: "请求超时请重试",
    headers: {
        // 'Content-Type': 'multipart/form-data',
        'Authorization': '',
    },
    throwErrIfParseFail: true,
    getResponse: false,//最终结果中不返回response信息
    errorHandler: (error) => {
        console.log(error)
        return {};
    }
});



// 注册内核进度条中间件
myRequest.use(progressMiddleware, { core: true });

// 在返回之前，可以使用myRequest.use添加中间件。
myRequest.use(async (ctx, next) => {
    // const { req, res } = ctx;
    try {
        ctx.req.options.headers = {
            ...ctx.req.options.headers,
            ...["/api/user/login", "/api/user/refreshToken", "/api/user/cap"].includes(ctx.req.url) ? {} : { "Authorization": localStorage.getItem("token") ?? "" },//设置不校验token的白名单
        };
        if (ctx.req.options.data) {
            if ((ctx.req.options.headers as any)?.BigInt) {
                ctx.req.options.body = JSONbig.stringify(ctx.req.options.data);//在这个位置支持一下超大数字，解决精度问题
                ctx.req.options.data = undefined;//如果要自己处理body数据，那么需要将data改为undefined，否则无法修改成功
            }
        }
        /**
         * 这里比较特别，在请求前将responseType先拿到
         * 因为在执行blob请求时，返回值可能是json（报错时），特别是在token过期时，我们希望它能将这个json返回进一步处理refreshToken
         * 但是所以需要再拦截器中将req.options.responseType中的值改为json，否则在下面的ctx.res将会拿到的是blob数据（即使里面保存了json数据，但无法取）
         * refreshToken请求完成后需要重新发起之前的请求，所以需要将req.options.responseType还原为之前的blob类型。
         * 具有一般性，所以直接提前拿到保存在一个变量中，这样就可以支持所有的类型（不仅仅是blob）
         */
        let responseType = ctx.req.options.responseType;
        await next();
        if ((ctx.req.options.responseType != "blob" && ctx.req.options.responseType != "arrayBuffer" && ctx.req.options.responseType != "text") || ctx.res?.code == 2010208) {
            // if (ctx.res.code != 1010100) {
            // 处理token过期的情况
            if (ctx.res?.code == 2010208) {
                let refreshToken = localStorage.getItem("refreshToken");
                if (!refreshToken) {
                    // 将token从localstorage或者sessionstorage移除,最好不要用clear()
                    localStorage.removeItem("token");
                    localStorage.removeItem("refreshToken");
                    localStorage.removeItem("userId");
                    localStorage.removeItem("userName");
                    localStorage.removeItem("roleName");
                    localStorage.removeItem("validLicenses"); // 授权信息
                    location.href = '/login';
                    return;
                }
                // 刷新token
                let res = await refreshTokenReqeust.post<API.ResponseData<{
                    refreshToken: string;
                    token: string;
                }>>('/api/user/refreshToken', {
                    data: { refreshToken: refreshToken }
                });
                if (res.code == 1010100) {
                    localStorage.setItem("token", res.data.token);
                    localStorage.setItem("refreshToken", res.data.refreshToken);
                    ctx.res = await myRequest(ctx.req.url, {
                        ...ctx.req.options, responseType, headers: {
                            ...ctx.req.options.headers,
                            Authorization: res.data.token
                        }
                    });
                }
                else {
                    if (location.pathname.startsWith('/large-visual-screen')) return;
                    // 将token从localstorage或者sessionstorage移除,最好不要用clear()
                    localStorage.removeItem("token");
                    localStorage.removeItem("refreshToken");
                    localStorage.removeItem("userId");
                    localStorage.removeItem("userName");
                    localStorage.removeItem("roleName");
                    localStorage.removeItem("validLicenses"); // 授权信息
                    location.href = '/login';
                }
            }
            //     //处理后端面向用户提示语
            //     if (ctx.res?.code?.toString()?.startsWith("3")) {
            //         message.error(ctx.res.msg);
            //     }
            //     else {
            //         message.error("请求异常，请稍后重试或联系管理员");
            //     }
            //     throw new Error("后台状态码校验熔断，错误消息:" + ctx.res.msg);//通过抛出错误熔断后面的逻辑
            // }
        }
    }
    catch {
        if (!ctx.res) ctx.res = {};
        if (ctx.req.url.endsWith('/file/upload')) {
            ctx.res = { code: 0, msg: '网关超时。' };
        }
    }
});

// 大屏拦截器，任何接口在大屏报错都不弹出错误信息(其他场景下都不适用)
myRequest.interceptors.response.use(async (response, options) => {
    // const urls = [
    //     '/api/project/1',
    //     '/api/realTimeProject/getLocal',
    //     '/api/sys/getCurrentTime',
    //     '/api/license/ifExpired',
    //     '/api/project/getTimeBoundary',
    //     '/api/realTimeProject/getLocal',
    //     '/api/situational/pktInfoHis',
    //     '/api/realTimeProject/weakEventInfo',
    //     '/api/realTimeProject/sensitiveEventInfo',
    //     '/api/realTimeProject/abnormalEventInfo',
    //     '/api/realTimeProject/provinceInfo',
    //     '/api/realTimeProject/threatSourceRank',
    //     '/api/projectSituation/threatTrend',
    //     '/api/threatEvent/list',
    //     '/api/projectSituation/threatTrend',
    //     '/api/realTimeProject/threatEventInfo',
    // ]; // 大屏接口白名单
    // const url = options.url;
    try {
        if (location.pathname.startsWith('/large-visual-screen')) {
            if (response.status == 200) {
                let data = await response.clone().json();
                if (data.code != 1010100) {
                    if (data.code == 2010208) { // 无效token
                        return response;
                    }
                    return undefined as any;
                }
            } else return undefined as any;
        }
    } catch (e) {
        console.warn("大屏接口warning");
    }
    return response;
})

//HTTP状态拦截，使用拦截器实现
myRequest.interceptors.response.use((response, options) => {
    const codeMessage: any = {
        200: '服务器成功返回请求的数据。',
        201: '新建或修改数据成功。',
        202: '一个请求已经进入后台排队（异步任务）。',
        204: '删除数据成功。',
        400: '请求有错误，服务器没有进行新建或修改的操作。',
        401: '用户没有权限（令牌、用户名、密码错误）。',
        403: '用户得到授权，但是访问是被禁止的。',
        404: '请求针对的是不存在的记录，服务器没有进行操作。',
        405: '请求方法不被允许。',
        406: '请求的格式不可得。',
        410: '请求的资源被永久删除，且不会再得到的。',
        422: '当创建一个对象时，发生一个验证错误。',
        500: '服务器发生错误，请检查服务器。',
        502: '网关错误。',
        503: '服务不可用，服务器暂时过载或维护。',
        504: '网关超时。',
    };
    if (response?.status != 200) {
        notification.open({
            message: response.status,
            description: codeMessage[response.status],
        });
        // throw new Error("HTTP状态码校验熔断");//通过抛出错误熔断后面的逻辑
        if (response.url.endsWith('/file/upload') && response?.status == 504) return response;
    }
    return response;
})

//拦截后端状态码不为1010100的错误处理
myRequest.interceptors.response.use(async (response, options) => {
    // if (options.responseType != "blob" && options.responseType != "arrayBuffer" && options.responseType != "text") {
    let data: any;
    try {
        data = await response.clone().json();
        if (options.responseType == "blob" && data?.msg) {
            if (data?.code == 2010208) { options.responseType = 'json' }
            else {
                if (data?.code != undefined && (data?.code?.toString()?.startsWith("3") || data?.code == 2010322 || data?.code == 2010323 || data?.code == 2010324 || data?.code == 2010325)) message.error(data?.msg);
                else message.error('下载失败');//data?.msg
                return;
            }
        }
    }
    catch (e) {
        if (options.responseType == "blob" || options.responseType == "arrayBuffer" || options.responseType == "text") return response;
        console.warn("返回值不能被解析成JSON格式");
    }
    if (response.url.endsWith('/file/upload') && response?.status == 504) return response;
    if ((data?.code == 2010216)) { // 会话超时，返回登录页
        message.error(data?.msg);
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("userId");
        localStorage.removeItem("userName");
        location.href = '/login';
    }
    /**
     * 下面这几个code不需要在管道中拦截，在流量分析弹框组件中进行判断
     * 2010322:数据被清理
     * 2010323:流量正在构建
     * 2010324:文件被清理
     * 2010325:流量数据未保存
     */
    if (!(data?.code?.toString().startsWith("1") || data?.code == 2010208 || data?.code == 2010322 || data?.code == 2010323 || data?.code == 2010324 || data?.code == 2010325)) {
        //后端返给用户的错误提示
        if (data?.code?.toString()?.startsWith("3")) {
            // 改版，所有的重复数据都不再这里进行拦截，关联禅道任务ID-669
            // 如果后端返回这个编码，不会拦截，约定为重复数据放行
            if (data?.code?.toString() == 3010104) {
                return response;
            } else message.error(data?.msg);
        }
        else {
            message.error("请求异常，请稍后重试或联系管理员");
        }
        return console.log(data?.msg) as any;
    }
    // }
    return response;
});

/**
 * 这个拦截器请忽略，主要用错误拦截不进入处理代码
 */
myRequest.interceptors.response.use(response => response);


export default myRequest;

/**
 * 下载文件收到res后的处理方法
 * @param res 
 * @param fileName 文件名称,需要带后缀
 */
export const myRequestDownload = (res: BlobPart, fileName: string) => {
    if (res && (res as any).type != 'application/json') {
        const blob = new Blob([res]);
        const objectURL = URL.createObjectURL(blob);
        let btn = document.createElement('a');
        btn.download = fileName;
        btn.href = objectURL;
        btn.click();
        URL.revokeObjectURL(objectURL);
        btn.remove();
    }
}
