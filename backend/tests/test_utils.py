import pytest
from unittest.mock import MagicMock
import sys
import os

# --- Mock Setup ---

class MockAPIError(Exception):
    """Mock for postgrest.exceptions.APIError"""
    def __init__(self, message_or_dict, code=None):
        if isinstance(message_or_dict, dict):
            self.message = message_or_dict.get('message', '')
            self.code = message_or_dict.get('code', '')
        else:
            self.message = str(message_or_dict)
            self.code = code
        super().__init__(self.message)

    def __str__(self):
        return self.message

# Manually insert mocks into sys.modules
mock_postgrest_exceptions = MagicMock()
mock_postgrest_exceptions.APIError = MockAPIError
sys.modules["postgrest"] = MagicMock()
sys.modules["postgrest.exceptions"] = mock_postgrest_exceptions
sys.modules["supabase"] = MagicMock()
sys.modules["supabase._async"] = MagicMock()
sys.modules["supabase._async.client"] = MagicMock()
sys.modules["httpx"] = MagicMock()
sys.modules["logger"] = MagicMock()

# Ensure backend directory is in path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Clear utils from sys.modules if it was already imported, to force re-import with our mocks
if "utils" in sys.modules:
    del sys.modules["utils"]

from utils import is_pgrst204_error

# --- Tests ---

def test_is_pgrst204_error_by_code():
    """Test identifying error by PGRST204 code."""
    error = MockAPIError({'code': 'PGRST204', 'message': 'Some generic error'})
    assert is_pgrst204_error(error) is True

def test_is_pgrst204_error_by_message():
    """Test identifying error by 'schema cache' substring in message."""
    error = MockAPIError({'code': 'PGRST999', 'message': 'Could not find column in schema cache'})
    assert is_pgrst204_error(error) is True

def test_is_pgrst204_error_case_insensitivity():
    """Test that 'schema cache' check is case-insensitive."""
    error = MockAPIError('CRITICAL SCHEMA CACHE ERROR')
    assert is_pgrst204_error(error) is True

def test_is_pgrst204_error_unrelated_apierror():
    """Test that other APIErrors are not identified as PGRST204."""
    error = MockAPIError({'code': 'PGRST200', 'message': 'Everything is fine'})
    assert is_pgrst204_error(error) is False

def test_is_pgrst204_error_non_api_exception():
    """Test that regular exceptions are not identified as PGRST204."""
    error = ValueError("An unrelated value error")
    assert is_pgrst204_error(error) is False

def test_is_pgrst204_error_none():
    """Test handling of None input."""
    assert is_pgrst204_error(None) is False
