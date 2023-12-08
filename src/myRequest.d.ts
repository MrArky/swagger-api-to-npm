declare const myRequest: import("umi-request").RequestMethod<false>;
export default myRequest;
/**
 * 下载文件收到res后的处理方法
 * @param res
 * @param fileName 文件名称,需要带后缀
 */
export declare const myRequestDownload: (res: BlobPart, fileName: string) => void;
