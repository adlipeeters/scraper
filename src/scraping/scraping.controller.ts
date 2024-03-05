import { Body, Controller, Get, HttpException, HttpStatus, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ScrapingService } from './scraping.service';
import { diskStorage } from 'multer';
import * as csvParser from 'csv-parser';
import * as fs from 'fs';
import { FileInterceptor } from '@nestjs/platform-express';
import { Worker } from 'worker_threads';
import { WorkerThreadFilePath } from '../worker/config';
import { storage } from 'src/storage';
import { ScrapeResult, ScrapeResultEnum, ScrapeResultStatusEnum, ScrapeStatistics } from './dtos/general';

@Controller('scraping')
export class ScrapingController {
    constructor(private readonly scrapingService: ScrapingService) {
    }
    @Get('scrape')
    async scrape(@Query('url') url: string): Promise<any> {
        return this.scrapingService.scrapeWebsite(url);
    }

    @Post('scrape-from-csv')
    @UseInterceptors(FileInterceptor('file', { storage }))
    async uploadCompaniesCsv(@UploadedFile() file, @Query() query: { website_limit: string, batch_limit: string, timeout: string }): Promise<ScrapeStatistics> {
        // ?website_limit=20&batch_limit=5
        const LIMIT = query?.website_limit ? parseInt(query.website_limit) : 1000;
        const BATCH_LIMIT = query?.batch_limit ? parseInt(query.batch_limit) : 5;
        const TIMEOUT = query?.timeout ? parseInt(query.timeout) : 60000; // 60,000 milliseconds = 1 minute
        let timeoutReached = false;

        const timer = setTimeout(() => {
            timeoutReached = true;
        }, TIMEOUT); // 600,000 milliseconds = 10 minutes

        await new Promise<void>((resolve) => {
            fs.createReadStream(file.path)
                .pipe(csvParser())
                .on('data', (data) => {
                    //! For testing purposes
                    // if (data.domain == 'mazautoglass.com') {
                    results.push(data)
                    // }
                }
                )
                .on('end', () => {
                    resolve();
                });
        });

        if (timeoutReached) {
            clearTimeout(timer); // Clear the timer as we're handling the timeout case
            fs.unlinkSync(file.path); // Clean up the uploaded file
            throw new HttpException('Processing timed out', HttpStatus.REQUEST_TIMEOUT);
        }

        // const tasks = results.slice(0, LIMIT).map(result => () => this.scrapeInWorker('https://' + result.domain));
        // const scrapeResults: ScrapeResult[] = await this.processInBatches(tasks, BATCH_LIMIT);
        // Since you have to wait for batches to complete, check for timeout after each batch
        const tasks = results.slice(0, LIMIT).map(result => () => {
            if (timeoutReached) return null; // Skip new tasks if timeout reached
            return this.scrapeInWorker('https://' + result.domain);
        });

        const scrapeResults: ScrapeResult[] = await this.processInBatches(tasks, BATCH_LIMIT, () => timeoutReached);
        clearTimeout(timer); // Ensure to clear the timer on normal completion

        // const scrapeResults = await Promise.all(results.slice(0, LIMIT).map(result =>
        //     this.scrapeInWorker('https://' + result.domain)
        // ));

        // Clean up the uploaded file
        let successScraped = 0;
        let failedScraped = 0;
        let noDataScraped = 0;
        let totalScraped = scrapeResults.length;

        scrapeResults.forEach((item, index) => {
            switch (item.result) {
                case ScrapeResultEnum.SUCCESS:
                    successScraped++;
                    item.status = ScrapeResultStatusEnum.SUCCESS
                    break;
                case ScrapeResultEnum.FAILED:
                    failedScraped++;
                    item.status = ScrapeResultStatusEnum.FAILED
                    break;
                case ScrapeResultEnum.NO_DATA:
                    noDataScraped++;
                    item.status = ScrapeResultStatusEnum.NO_DATA
                    break;
                default:
                    break;
            }
        });

        fs.unlinkSync(file.path);

        return {
            statistics: {
                limitToScrape: LIMIT,
                batchLimit: BATCH_LIMIT,
                timeoutLimit: TIMEOUT,
                totalScraped,
                successScraped,
                failedScraped,
                noDataScraped,
                efficiency: ((successScraped / (successScraped + failedScraped + noDataScraped)) * 100) + '%'
            },
            result: scrapeResults
        };
    }

    async processInBatches(tasks, limit, isTimeoutReached: () => boolean) {
        let results = [];
        for (let i = 0; i < tasks.length; i += limit) {
            if (isTimeoutReached()) {
                console.log('Timeout reached, stopping batch processing');
                break; // Exit the loop, stopping further batch processing
            }
            const batch = tasks.slice(i, i + limit);
            const batchResults = await Promise.all(batch.map(task => task()));
            results = [...results, ...batchResults];
        }
        return results;
    }

    private async scrapeInWorker(domain) {
        return new Promise((resolve, reject) => {
            const worker = new Worker(WorkerThreadFilePath, { workerData: { domain } });
            worker.once('message', resolve);
            worker.once('error', reject);
        });
    }

}
