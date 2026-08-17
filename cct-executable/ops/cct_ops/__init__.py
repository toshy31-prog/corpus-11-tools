"""Prototype local et hors ligne d'opérations institutionnelles CCT."""

from .core import CCTError, InstitutionalService
from .store import EventStore

__all__ = ["CCTError", "EventStore", "InstitutionalService"]
__version__ = "0.1.0-prototype"
