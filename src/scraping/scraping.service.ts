import { Injectable } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import { HelperService } from './helper.service';

@Injectable()
export class ScrapingService {
    helperService: HelperService;
    constructor() {
        this.helperService = new HelperService();
    }

    async scrapeWebsite(url: string): Promise<any> {
        try {
            if (!await this.helperService.canScrape(url)) {
                console.log('Scraping is disallowed by robots.txt:', url);
                return null;
            }
            const browser = await puppeteer.launch({
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            });
            const page = await browser.newPage();
            await page.goto(url, { waitUntil: 'networkidle0' });

            const navigationUrls = await this.findNavigationUrls(page);
            const homepageData = await this.extractPageData(page);

            let contactData = {};
            if (navigationUrls.contactPageUrl) {
                await page.goto(navigationUrls.contactPageUrl, { waitUntil: 'networkidle0' });
                contactData = await this.extractPageData(page);
            }

            let aboutData = {};
            if (navigationUrls.aboutPageUrl) {
                await page.goto(navigationUrls.aboutPageUrl, { waitUntil: 'networkidle0' });
                aboutData = await this.extractPageData(page);
            }

            await browser.close();

            return this.consolidateData([homepageData, contactData, aboutData]);
        } catch (error) {
            // console.error('Error scraping website ' + url + ' Error:', error);
            return []
        }
    }

    private async extractPageData(page: puppeteer.Page): Promise<any> {
        const phoneNumbers = await this.extractPhoneNumbers(page);
        const socialMediaLinks = await this.extractSocialMediaLinks(page);
        const addresses = await this.extractAddresses(page);
        // const companyName = await this.extractCompanyName(page) ||
        // await this.extractCompanyNameFromH1(page);

        return { phoneNumbers, socialMediaLinks, addresses };
    }

    private async findNavigationUrls(page: puppeteer.Page): Promise<any> {
        return page.evaluate(() => {
            const urls = {};
            const anchors = Array.from(document.querySelectorAll('a'));
            anchors.forEach(anchor => {
                const text = anchor.textContent.toLowerCase();
                const href = anchor.href;
                if (text.includes('contact')) urls['contactPageUrl'] = href;
                if (text.includes('about')) urls['aboutPageUrl'] = href;
                if (text.includes('support')) urls['aboutPageUrl'] = href;
            });
            return urls;
        });
    }

    private async extractPhoneNumbers(page: puppeteer.Page): Promise<string[]> {
        return page.evaluate(() => {
            // Updated regex pattern for common phone number formats
            const regex = /\(?\b\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
            const text = document.body.innerText;
            const matches = text.match(regex) || [];

            // Post-processing to filter out invalid entries
            const filteredMatches = matches.filter(match => {
                // Remove entries that are too short to be phone numbers or contain only symbols/whitespace
                const cleanMatch = match.replace(/[\s-().]/g, ''); // Remove common phone number symbols
                return cleanMatch.length >= 7 && /\d+/.test(cleanMatch); // Ensure there's at least one digit
            });

            return Array.from(new Set(filteredMatches)); // Remove duplicates
        });
    }

    private async extractSocialMediaLinks(page: puppeteer.Page): Promise<string[]> {
        return page.evaluate(() => {
            const domains = ['facebook.com', 'twitter.com', 'linkedin.com', 'instagram.com'];
            const links = Array.from(document.querySelectorAll('a'));
            return links
                .filter(a => domains.some(domain => a.href.includes(domain)))
                .map(a => a.href);
        });
    }

    private async extractAddresses(page: puppeteer.Page): Promise<string[]> {
        return await page.evaluate(() => {
            const addressElements = Array.from(document.querySelectorAll('[itemprop="address"], .address, [class*="address"], [id*="address"]'));
            return addressElements.map(element => {
                const addressElement = element as HTMLElement;
                return addressElement.innerText.trim();
            }).filter(address => address); // Filter out any empty strings
        });
    }

    private async extractCompanyName(page: puppeteer.Page): Promise<string> {
        return await page.evaluate(() => {
            const title = document.title || '';
            return title.split('|')[0].trim();
        });
    }

    private async extractCompanyNameFromH1(page: puppeteer.Page): Promise<string> {
        return await page.evaluate(() => {
            const h1 = document.querySelector('h1');
            return h1 ? h1.textContent.trim() : '';
        });
    }

    private consolidateData(dataArray: any[]): any {
        const consolidated = {
            phoneNumbers: [],
            socialMediaLinks: [],
            addresses: [],
            // companyName: '',
        };

        dataArray?.forEach(data => {
            consolidated.phoneNumbers = [...new Set([...consolidated.phoneNumbers, ...(data.phoneNumbers || [])])];
            consolidated.socialMediaLinks = [...new Set([...consolidated.socialMediaLinks, ...(data.socialMediaLinks || [])])];
            consolidated.addresses = [...new Set([...consolidated.addresses, ...(data.addresses || [])])];
            // consolidated.companyName = data.companyName || consolidated.companyName;
            // consolidated.companyName = [...new Set([...consolidated.companyName, ...(data.companyName || [])])];
        });

        return consolidated;
    }
}
