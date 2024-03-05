import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ScrapingService } from '../scraping/scraping.service';
import { ElasticsearchService } from "../elasticsearch/elasticsearch.service";
import { parentPort, workerData } from 'worker_threads';

//! 0 -> Fail to scrap
//! 1 -> Scraped with success
//! 2 -> Scraped with success but the data is not complete

async function run() {
    const companiesIndex = 'companies';
    let scrapeResult = 0;
    const app = await NestFactory.createApplicationContext(AppModule);
    const scrapingService = app.get(ScrapingService);
    const elasticSearchService = app.get(ElasticsearchService);
    const searchByDomain = await elasticSearchService.searchByDomain(companiesIndex, workerData.domain);

    // If the domain is already in the database, return the data from the database and don't scrape the website because it's already scraped
    //!This method is for the moment when scraper function will be implemented 100% and it will be able to scrape all the data from the website
    // if (
    //     searchByDomain?.phoneNumbers?.length > 0
    //     || searchByDomain?.socialMediaLinks?.length > 0
    //     || searchByDomain?.addresses?.length > 0
    // ) {
    //     parentPort.postMessage(searchByDomain);
    //     return;
    // }
    const result = await scrapingService.scrapeWebsite(workerData.domain);
    const saveDataInElasticSearch = await elasticSearchService.updateDocumentByDomain(companiesIndex, workerData.domain, result);
    if (result.length === 0) {
        scrapeResult = 0;
    } else if (result?.phoneNumbers?.length > 0 || result?.socialMediaLinks?.length > 0 || result?.addresses?.length > 0) {
        scrapeResult = 1;
    } else {
        scrapeResult = 2;
    }

    // parentPort.postMessage(result);
    parentPort.postMessage({ domain: workerData.domain, result: scrapeResult });
}

run();