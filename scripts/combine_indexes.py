#!/usr/bin/env python3

"""
combine_indexes.py

This script combines the Guide_Documents_Metadata_Index.json and
Policy_Documents_Metadata_Index.json files into a single MHA_Documents_Metadata_Index.json file.

It adds a "Document Type" field to each document entry and removes the ".json" extension
from filenames in the Guide documents.
"""

import json
import os
import sys
from pathlib import Path

def main():
    # Get the correct paths
    script_dir = Path(__file__).parent.absolute()
    project_root = script_dir.parent.parent
    
    guide_index_path = project_root / "Guide_Documents_Metadata_Index.json"
    policy_index_path = project_root / "Policy_Documents_Metadata_Index.json"
    output_path = project_root / "MHA_Documents_Metadata_Index.json"
    
    print(f"Reading guide index from: {guide_index_path}")
    print(f"Reading policy index from: {policy_index_path}")
    
    try:
        # Read and parse the input files
        with open(guide_index_path, 'r') as f:
            guide_index = json.load(f)
        
        with open(policy_index_path, 'r') as f:
            policy_index = json.load(f)
        
        # Process guide documents - add document type and strip .json extension
        processed_guide_documents = []
        for doc in guide_index["Guide Documents"]:
            # Create a copy of the document
            processed_doc = doc.copy()
            # Add document type
            processed_doc["Document Type"] = "Guide"
            # Strip .json extension
            processed_doc["File"] = processed_doc["File"].replace(".json", "")
            processed_guide_documents.append(processed_doc)
        
        # Process policy documents - add document type (keep file extension as is)
        processed_policy_documents = []
        for doc in policy_index["Policy Documents"]:
            # Create a copy of the document
            processed_doc = doc.copy()
            # Add document type
            processed_doc["Document Type"] = "Policy"
            processed_policy_documents.append(processed_doc)
        
        # Combine the documents
        combined_index = {
            "MHA Documents": processed_guide_documents + processed_policy_documents
        }
        
        # Write the combined index to the output file
        with open(output_path, 'w') as f:
            json.dump(combined_index, f, indent=4)
        
        print(f"Successfully combined indexes into {output_path}")
        print(f"Total documents: {len(combined_index['MHA Documents'])}")
        print(f"- Guides: {len(processed_guide_documents)}")
        print(f"- Policies: {len(processed_policy_documents)}")
        
    except Exception as e:
        print(f"Error combining indexes: {e}", file=sys.stderr)
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main()) 