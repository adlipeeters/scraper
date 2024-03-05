// elasticsearch.controller.ts
import { Body, Controller, Delete, Get, Param, Post, Put, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ElasticsearchService } from './elasticsearch.service';
import { CreateCompanyIndexDTO } from './dtos/create-company-index.dto';
import { storage } from 'src/storage';
import { FileInterceptor } from '@nestjs/platform-express';
import * as csvParser from 'csv-parser';
import * as fs from 'fs';

@Controller('elasticsearch')
export class ElasticsearchController {
    constructor(private readonly elasticsearchService: ElasticsearchService) { }

    @Post('create-company-index')
    async createIndex(@Body() createCompanyIndexDTO: CreateCompanyIndexDTO) {
        const index = 'companies';

        const indexExists = await this.elasticsearchService.indexExists(index);
        console.log(indexExists);
        if (!indexExists) {
            await this.elasticsearchService.createIndex(index);
        }

        return { message: 'Index created successfully', index };
    }

    @Post(':index')
    async addDocument(@Param('index') index: string, @Body() body: any) {
        return await this.elasticsearchService.addDocument(index, body.document);
    }

    // @Get(':index/:id')
    // async getDocument(@Param('index') index: string, @Param('id') id: string) {
    //     return await this.elasticsearchService.getDocument(index, id);
    // }

    @Put(':index/:id')
    async updateDocument(@Param('index') index: string, @Param('id') id: string, @Body() body: any) {
        return await this.elasticsearchService.updateDocument(index, id, body.document);
    }

    @Delete(':index/:id')
    async deleteDocument(@Param('index') index: string, @Param('id') id: string) {
        return await this.elasticsearchService.deleteDocument(index, id);
    }

    @Get('search/:index')
    async search(@Param('index') index: string, @Query() query: any) {
        // console.log(query)
        // return
        return await this.elasticsearchService.search(index, query);
    }

    @Get(':index/documents/all')
    async getAllDocuments(@Param('index') index: string, @Query() query: any) {
        const documents = await this.elasticsearchService.getAllDocuments(index, query.limit);
        return documents;
    }

    @Post("bulk-insert/csv-sample-company-data")
    @UseInterceptors(FileInterceptor('file', { storage }))
    async bulk(@UploadedFile() file) {
        const index = 'companies';
        const results = [];
        await new Promise<void>((resolve) => {
            fs.createReadStream(file.path)
                .pipe(csvParser())
                .on('data', (data) => results.push(
                    {
                        companyName: data.company_legal_name,
                        domain: data.domain,
                    }
                ))
                .on('end', () => {
                    resolve();
                });
        });

        return await this.elasticsearchService.bulkIndexDocuments(index, results);
    }

    @Delete('resetdata/companies/all')
    async clearIndex() {
        const index = 'companies';
        return await this.elasticsearchService.deleteAllDocuments(index);
    }
}
