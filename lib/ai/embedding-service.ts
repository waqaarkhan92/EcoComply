/**
 * Embedding Service
 * Generates and manages OpenAI embeddings for semantic search
 * Reference: docs/specs/90_Enhanced_Features_V2.md Section 2
 */

import OpenAI from 'openai';
import { supabaseAdmin } from '@/lib/supabase/server';

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;
const MAX_TOKENS_PER_REQUEST = 8191; // Model limit
const BATCH_SIZE = 100; // Process embeddings in batches

export interface EmbeddingResult {
  entity_type: string;
  entity_id: string;
  embedding: number[];
  content_text: string;
}

export interface SearchResult {
  entity_type: string;
  entity_id: string;
  similarity: number;
  content_text: string;
  metadata?: Record<string, any>;
}

class EmbeddingService {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    // Truncate text if too long (rough approximation: 4 chars per token)
    const maxChars = MAX_TOKENS_PER_REQUEST * 4;
    const truncatedText = text.length > maxChars ? text.substring(0, maxChars) : text;

    const response = await this.client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: truncatedText,
      dimensions: EMBEDDING_DIMENSIONS,
    });

    return response.data[0].embedding;
  }

  /**
   * Generate embeddings for multiple texts (batch)
   */
  async generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
    // Truncate texts
    const maxChars = MAX_TOKENS_PER_REQUEST * 4;
    const truncatedTexts = texts.map(t =>
      t.length > maxChars ? t.substring(0, maxChars) : t
    );

    const response = await this.client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: truncatedTexts,
      dimensions: EMBEDDING_DIMENSIONS,
    });

    return response.data.map(d => d.embedding);
  }

  /**
   * Store embedding in database
   */
  async storeEmbedding(
    companyId: string,
    entityType: 'obligation' | 'document' | 'evidence' | 'site',
    entityId: string,
    contentText: string
  ): Promise<void> {
    const embedding = await this.generateEmbedding(contentText);

    // Upsert embedding (update if exists, insert if not)
    const { error } = await supabaseAdmin
      .from('content_embeddings')
      .upsert(
        {
          company_id: companyId,
          entity_type: entityType,
          entity_id: entityId,
          content_text: contentText,
          embedding: `[${embedding.join(',')}]`, // PostgreSQL vector format
          embedding_model: EMBEDDING_MODEL,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'entity_type,entity_id',
        }
      );

    if (error) {
      console.error('Error storing embedding:', error);
      throw new Error(`Failed to store embedding: ${error.message}`);
    }
  }

  /**
   * Semantic search using embeddings
   */
  async semanticSearch(
    companyId: string,
    query: string,
    options: {
      entityTypes?: ('obligation' | 'document' | 'evidence' | 'site')[];
      limit?: number;
      minSimilarity?: number;
    } = {}
  ): Promise<SearchResult[]> {
    const { entityTypes, limit = 20, minSimilarity = 0.5 } = options;

    // Generate embedding for query
    const queryEmbedding = await this.generateEmbedding(query);

    // Perform vector similarity search using PostgreSQL
    // Note: This requires the pgvector extension and the ivfflat index
    const { data, error } = await supabaseAdmin.rpc('search_embeddings', {
      query_embedding: `[${queryEmbedding.join(',')}]`,
      match_company_id: companyId,
      match_entity_types: entityTypes || ['obligation', 'document', 'evidence', 'site'],
      match_threshold: minSimilarity,
      match_count: limit,
    });

    if (error) {
      // If the RPC doesn't exist, fall back to a simpler query
      console.warn('RPC search_embeddings not found, using fallback search');
      return this.fallbackSearch(companyId, query, options);
    }

    return data.map((row: any) => ({
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      similarity: row.similarity,
      content_text: row.content_text,
    }));
  }

  /**
   * Fallback search using text matching when vector search is unavailable
   */
  private async fallbackSearch(
    companyId: string,
    query: string,
    options: {
      entityTypes?: string[];
      limit?: number;
    } = {}
  ): Promise<SearchResult[]> {
    const { entityTypes, limit = 20 } = options;
    const results: SearchResult[] = [];

    // Search obligations
    if (!entityTypes || entityTypes.includes('obligation')) {
      const { data: obligations } = await supabaseAdmin
        .from('obligations')
        .select('id, obligation_title, obligation_description, original_text')
        .eq('company_id', companyId)
        .or(`obligation_title.ilike.%${query}%,obligation_description.ilike.%${query}%,original_text.ilike.%${query}%`)
        .limit(limit);

      if (obligations) {
        results.push(
          ...obligations.map(o => ({
            entity_type: 'obligation',
            entity_id: o.id,
            similarity: 0.7, // Placeholder similarity for text match
            content_text: o.obligation_title || o.obligation_description || o.original_text || '',
          }))
        );
      }
    }

    // Search documents
    if (!entityTypes || entityTypes.includes('document')) {
      const { data: documents } = await supabaseAdmin
        .from('documents')
        .select('id, title, extracted_text')
        .eq('company_id', companyId)
        .or(`title.ilike.%${query}%,extracted_text.ilike.%${query}%`)
        .limit(limit);

      if (documents) {
        results.push(
          ...documents.map(d => ({
            entity_type: 'document',
            entity_id: d.id,
            similarity: 0.7,
            content_text: d.title || '',
          }))
        );
      }
    }

    // Search sites
    if (!entityTypes || entityTypes.includes('site')) {
      const { data: sites } = await supabaseAdmin
        .from('sites')
        .select('id, name, address, city')
        .eq('company_id', companyId)
        .or(`name.ilike.%${query}%,address.ilike.%${query}%,city.ilike.%${query}%`)
        .limit(limit);

      if (sites) {
        results.push(
          ...sites.map(s => ({
            entity_type: 'site',
            entity_id: s.id,
            similarity: 0.7,
            content_text: `${s.name} - ${s.address || ''} ${s.city || ''}`.trim(),
          }))
        );
      }
    }

    return results.slice(0, limit);
  }

  /**
   * Generate and store embeddings for all obligations in a company
   */
  async indexObligations(companyId: string): Promise<number> {
    const { data: obligations, error } = await supabaseAdmin
      .from('obligations')
      .select('id, obligation_title, obligation_description, original_text, category')
      .eq('company_id', companyId);

    if (error || !obligations) {
      throw new Error(`Failed to fetch obligations: ${error?.message}`);
    }

    let indexed = 0;
    for (let i = 0; i < obligations.length; i += BATCH_SIZE) {
      const batch = obligations.slice(i, i + BATCH_SIZE);

      for (const obligation of batch) {
        const contentText = [
          obligation.obligation_title,
          obligation.obligation_description,
          obligation.original_text,
          obligation.category,
        ]
          .filter(Boolean)
          .join(' | ');

        if (contentText.trim()) {
          try {
            await this.storeEmbedding(companyId, 'obligation', obligation.id, contentText);
            indexed++;
          } catch (e) {
            console.error(`Failed to index obligation ${obligation.id}:`, e);
          }
        }
      }
    }

    return indexed;
  }

  /**
   * Generate and store embeddings for all documents in a company
   */
  async indexDocuments(companyId: string): Promise<number> {
    const { data: documents, error } = await supabaseAdmin
      .from('documents')
      .select('id, title, extracted_text, document_type')
      .eq('company_id', companyId);

    if (error || !documents) {
      throw new Error(`Failed to fetch documents: ${error?.message}`);
    }

    let indexed = 0;
    for (const doc of documents) {
      // Limit extracted_text to first 10000 chars for embedding
      const extractedText = doc.extracted_text?.substring(0, 10000) || '';
      const contentText = [doc.title, doc.document_type, extractedText]
        .filter(Boolean)
        .join(' | ');

      if (contentText.trim()) {
        try {
          await this.storeEmbedding(companyId, 'document', doc.id, contentText);
          indexed++;
        } catch (e) {
          console.error(`Failed to index document ${doc.id}:`, e);
        }
      }
    }

    return indexed;
  }

  /**
   * Generate and store embeddings for all sites in a company
   */
  async indexSites(companyId: string): Promise<number> {
    const { data: sites, error } = await supabaseAdmin
      .from('sites')
      .select('id, name, address, city, postcode, region')
      .eq('company_id', companyId);

    if (error || !sites) {
      throw new Error(`Failed to fetch sites: ${error?.message}`);
    }

    let indexed = 0;
    for (const site of sites) {
      const contentText = [site.name, site.address, site.city, site.postcode, site.region]
        .filter(Boolean)
        .join(' | ');

      if (contentText.trim()) {
        try {
          await this.storeEmbedding(companyId, 'site', site.id, contentText);
          indexed++;
        } catch (e) {
          console.error(`Failed to index site ${site.id}:`, e);
        }
      }
    }

    return indexed;
  }

  /**
   * Remove embedding for a specific entity
   */
  async removeEmbedding(entityType: string, entityId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('content_embeddings')
      .delete()
      .eq('entity_type', entityType)
      .eq('entity_id', entityId);

    if (error) {
      console.error('Error removing embedding:', error);
    }
  }

  /**
   * Index all content for a company (full reindex)
   */
  async indexAllContent(companyId: string): Promise<{ obligations: number; documents: number; sites: number }> {
    const [obligations, documents, sites] = await Promise.all([
      this.indexObligations(companyId),
      this.indexDocuments(companyId),
      this.indexSites(companyId),
    ]);

    return { obligations, documents, sites };
  }
}

// Export singleton instance
export const embeddingService = new EmbeddingService();
