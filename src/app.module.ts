import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ScrapingService } from './scraping/scraping.service';
import { ScrapingController } from './scraping/scraping.controller';
import { ScrapingModule } from './scraping/scraping.module';
import { ElasticsearchModule } from './elasticsearch/elasticsearch.module';

@Module({
  imports: [ScrapingModule, ElasticsearchModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
