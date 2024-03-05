import { Injectable } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import robotsParser from 'robots-parser';
import fetch from 'node-fetch';

@Injectable()
export class HelperService {
    async canScrape(url: string): Promise<boolean> {
        const robotsUrl = new URL('/robots.txt', url).href;
        try {
            const response = await fetch(robotsUrl);
            if (!response.ok) {
                return true;
            }
            const robotsTxt = await response.text();
            const robots = robotsParser(robotsUrl, robotsTxt);
            return robots.isAllowed(url, '*');
        } catch (error) {
            return true;
        }
    }
}
