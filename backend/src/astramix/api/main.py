"""Compatibility entry point: all Python API routes use the same validation."""
from app.main import app

__all__ = ['app']
