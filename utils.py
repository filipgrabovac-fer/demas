class CsvChunker:
    def __init__(self, csv_content: str, chunk_size: int):
        self.csv_content = csv_content
        self.chunk_size = chunk_size

    def chunk(self) -> list[list[str]]:
        """Split CSV into chunks of chunk_size rows (excluding header)."""
        lines = self.csv_content.strip().split("\n")
        header = lines[0]
        rows = lines[1:]
        
        chunks = []
        for i in range(0, len(rows), self.chunk_size):
            chunk_rows = [header] + rows[i:i + self.chunk_size]
            chunks.append(chunk_rows)
        
        return chunks
