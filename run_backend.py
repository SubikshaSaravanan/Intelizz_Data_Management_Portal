import sys
import os

# Add the current directory to the sys.path to ensure backend package is found
sys.path.append(os.getcwd())

from backend.app import app

if __name__ == "__main__":
    app.run(debug=True, port=5000)
