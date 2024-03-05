import { Module } from '@nestjs/common';
import { ElasticsearchService } from './elasticsearch.service';
import { ElasticsearchController } from './elasticsearch.controller';

@Module({
  providers: [ElasticsearchService],
  controllers: [ElasticsearchController]
})
export class ElasticsearchModule {}
