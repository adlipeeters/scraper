// elasticsearch.service.ts
import { Injectable } from '@nestjs/common';
import { Client } from '@elastic/elasticsearch';

@Injectable()
export class ElasticsearchService {
    private readonly client: Client;

    constructor() {
        this.client = new Client({
            node: process.env.ELASTICSEARCH_NODE,
        });
    }

    async indexExists(index: string): Promise<boolean> {
        const result = await this.client.indices.exists({ index });
        return result;
    }

    async createIndex(index: string) {
        return await this.client.indices.create({
            index,
            body: {
                settings: {
                },
                mappings: {
                    properties: {
                        phoneNumbers: { type: 'keyword' },
                        socialMediaLinks: { type: 'keyword' },
                        addresses: { type: 'text' },
                        companyName: { type: 'text' },
                        domain: { type: 'text' },
                    }
                }
            }
        });
    }

    async addDocument(index: string, document: any) {
        return await this.client.index({
            index,
            body: document,
        });
    }

    async getDocument(index: string, id: string) {
        return await this.client.get({
            index,
            id,
        });
    }

    async updateDocument(index: string, id: string, document: any) {
        return await this.client.update({
            index,
            id,
            body: {
                doc: document,
            },
        });
    }

    async updateDocumentByDomain(index: string, domain: string, updates: any) {
        try {
            const response = await this.client.updateByQuery({
                index,
                body: {
                    script: {
                        source: Object.entries(updates).map(([key, value]) =>
                            `ctx._source.${key} = params.${key}`
                        ).join('; '),
                        params: updates,
                        lang: 'painless'
                    },
                    query: {
                        match: { domain: domain }
                    }
                },
                // Options to wait for the operation to complete and refresh the index
                refresh: true,
                wait_for_completion: true,
            });

            return true;
        } catch (error) {

        }
    }


    async deleteDocument(index: string, id: string) {
        return await this.client.delete({
            index,
            id,
        });
    }

    async search(index: string, query: { companyName?: string; domain?: string; addresses?: string; socialMediaLinks?: string; phoneNumbers?: string; }) {
        const searchQuery: any = {
            bool: {
                should: [],
                minimum_should_match: 1, // Adjust this value as needed
            }
        };

        if (query.companyName) {
            searchQuery.bool.should.push({ match: { companyName: query.companyName } });
        }
        if (query.domain) {
            searchQuery.bool.should.push({ match: { domain: query.domain } });
        }
        if (query.addresses) {
            searchQuery.bool.should.push({ match: { addresses: query.addresses } });
        }
        if (query.socialMediaLinks) {
            searchQuery.bool.should.push({ match: { socialMediaLinks: query.socialMediaLinks } });
        }
        if (query.phoneNumbers) {
            searchQuery.bool.should.push({ match: { phoneNumbers: query.phoneNumbers } });
        }

        return await this.client.search({
            index,
            body: {
                query: searchQuery,
            },
        });
    }

    async searchByDomain(index: string, domain: string) {
        const response = await this.client.search({
            index,
            body: {
                query: {
                    match: {
                        domain: domain
                    }
                },
            },
            size: 1,
        });

        if (response.hits.hits.length > 0) {
            return response.hits.hits[0]._source;
        } else {
            return null;
        }
    }



    async bulkIndexDocuments(index: string, documents: any[]) {
        const body = documents.flatMap(doc => [
            { index: { _index: index, _id: doc.id } },
            doc
        ]);

        const bulkResponse = await this.client.bulk({ refresh: true, body });

        if (bulkResponse.errors) {
            const erroredDocuments = bulkResponse.items.flatMap((item, i) => {
                const operationKey = Object.keys(item)[0];
                const operation = item[operationKey];
                if (operation.error) {
                    return [{
                        ...documents[i],
                        error: operation.error,
                    }];
                }
                return [];
            });
            return { errors: true, erroredDocuments };
        }

        return { errors: false, message: "Bulk index operation completed successfully." };
    }


    async getAllDocuments(index: string, size: number = 1000) {
        const result = await this.client.search({
            index,
            body: {
                query: {
                    match_all: {}
                },
                size,
            }
        });

        return result.hits.hits.map(hit => hit._source);
    }

    async deleteAllDocuments(index: string) {
        const result = await this.client.deleteByQuery({
            index,
            body: {
                query: {
                    match_all: {}
                }
            },
            refresh: true,
            wait_for_completion: true,
        });
        return result;
    }
}
