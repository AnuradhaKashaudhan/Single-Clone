"""
Startup wrapper that patches Pydantic v1 for Python 3.13 compatibility
"""
import sys
import typing

# Patch Pydantic ForwardRef for Python 3.13 compatibility
if sys.version_info >= (3, 13):
    original_evaluate = typing.ForwardRef._evaluate
    
    def patched_evaluate(self, globalns, localns, *args, recursive_guard=None, **kwargs):
        if recursive_guard is None:
            recursive_guard = set()
        return original_evaluate(self, globalns, localns, *args, recursive_guard=recursive_guard, **kwargs)
    
    typing.ForwardRef._evaluate = patched_evaluate

# Now import and run the app
if __name__ == "__main__":
    import uvicorn
    from app import app
    
    uvicorn.run(app, host="0.0.0.0", port=8000)
