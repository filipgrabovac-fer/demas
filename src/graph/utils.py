import json
from typing import Any


class CsvChunker:
    def __init__(self, data: list[dict[str, Any]], chunk_size: int):
        """
        Initialize CSV chunker with an array of objects.
        
        Args:
            data: Array of objects (dictionaries) to chunk
            chunk_size: Number of objects per chunk
        """
        if not isinstance(data, list):
            raise ValueError("Data must be an array/list of objects.")
        
        if len(data) == 0:
            raise ValueError("Data array is empty.")
        
        if not all(isinstance(item, dict) for item in data):
            raise ValueError("All items in the data array must be objects (dictionaries).")
        
        self.data = data
        self.chunk_size = chunk_size

    def chunk(self) -> list[list[dict[str, Any]]]:
        """Split array of objects into chunks of chunk_size objects."""
        chunks = []
        for i in range(0, len(self.data), self.chunk_size):
            chunk_objects = self.data[i:i + self.chunk_size]
            chunks.append(chunk_objects)
        
        return chunks


class JsonChunker:
    def __init__(self, data: list[dict[str, Any]], chunk_size: int):
        """
        Initialize JSON chunker with an array of objects.
        
        Args:
            data: Array of objects (dictionaries) to chunk
            chunk_size: Number of objects per chunk
        """
        if not isinstance(data, list):
            raise ValueError("Data must be an array/list of objects.")
        
        if len(data) == 0:
            raise ValueError("Data array is empty.")
        
        if not all(isinstance(item, dict) for item in data):
            raise ValueError("All items in the data array must be objects (dictionaries).")
        
        self.data = data
        self.chunk_size = chunk_size

    def chunk(self) -> list[list[dict[str, Any]]]:
        """Split array of objects into chunks of chunk_size objects."""
        chunks = []
        for i in range(0, len(self.data), self.chunk_size):
            chunk_objects = self.data[i:i + self.chunk_size]
            chunks.append(chunk_objects)
        
        return chunks