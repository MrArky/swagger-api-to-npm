declare namespace API {
    /**
     * 统一返回数据接口
     */
    interface ResponseData<T> {
        code: number;
        data: T;
        msg: string;
    }

    /**
     * 分页数据接口
     */
    interface PageData<T> {
        hasMore: boolean;
        count: number;
        index: number;
        pageSize: number;
        list: T[];
    }

    /**
     * 分页查询参数接口
     */
    interface PageParams {
        pageSize?: number;
        index?: number;
        keyword?: string;
        sort?: string[];
        queryGroup?: QueryGroup;
    }
    interface QueryGroup {
        // /**
        //  * AND、OR、CUSTOM
        //  */
        // groupOp: "AND" | "OR" | "CUSTOM";
        /**
    * 查询字段规则数组,与分组并列
    */
        rules?: (QueryRule | QueryGroup)[];
        /**
         * 连接符（怎么跟前面的条件连接）
         */
        conn?: "AND" | "OR"
    }

    interface QueryRule {
        /**
         * 列字段名
         */
        field: string;
        /**
         * 操作符：>、<、= ……
         */
        op: QueryRuleOperate;
        /**
         * 值
         */
        data: any;
        /**
        * 连接符（怎么跟前面的条件连接）
        */
        conn?: "AND" | "OR"
    }
    type QueryRuleOperate = "EQ" | "NE" | "GT" | "LT" | "GE" | "LE" | "IN" | "NIN" | "LIKE" | "NLIKE" | "AHA" | "ANHA" | "AHANY" | "ANHANY" | "ISSTRNULL" | "ISNOTSTRNULL";
}

declare namespace VO {
    /**
     * label\value数据类型
     */
    interface LabeledValue {
        label: string;
        value: string | number;
        key?: string | number;
    }
}