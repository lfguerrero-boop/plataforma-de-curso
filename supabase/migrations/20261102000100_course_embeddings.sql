create extension if not exists vector; 
alter table public.courses add column embedding vector(384); 
create index courses_embedding_idx 
on public.courses using hnsw (embedding vector_cosine_ops); 
