export enum ScrapeResultEnum {
    FAILED = 0,
    SUCCESS = 1,
    NO_DATA = 2
}

export enum ScrapeResultStatusEnum {
    SUCCESS = 'SUCCESS',
    FAILED = 'FAILED',
    NO_DATA = 'NO_DATA'
}

export interface ScrapeResult {
    domain?: string;
    result?: ScrapeResultEnum;
    status: ScrapeResultStatusEnum;
}

export interface ScrapeStatistics {
    result: ScrapeResult[]
    statistics:
    {
        limitToScrape?: number,
        batchLimit?: number,
        timeoutLimit?: number,
        totalScraped: number
        successScraped: number,
        failedScraped: number,
        noDataScraped: number,
        efficiency: number | string
    }
}