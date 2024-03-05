import { Module } from '@nestjs/common';
import { ScrapingService } from './scraping.service';
import { HelperService } from './helper.service';
import { ScrapingController } from './scraping.controller';
import { MulterModule } from '@nestjs/platform-express';

@Module({
    imports: [
        MulterModule.register({
            dest: './uploads',
        })
    ],
    controllers: [ScrapingController],
    providers: [ScrapingService, HelperService]
})
export class ScrapingModule {
}
