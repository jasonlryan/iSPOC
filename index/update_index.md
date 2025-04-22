# Sync Vector Directory with Metadata Index

Please perform the following tasks to ensure the Policy Documents Metadata Index accurately reflects all policy documents in the Vector directory:

1. Compare the contents of both locations:

   - List all `.txt` files in the Vector directory (excluding project.txt)
   - List all files referenced in `Policy_Documents_Metadata_Index.json`

2. Identify discrepancies:

   - Files present in Vector but missing from Metadata Index
   - Files referenced in Metadata Index but missing from Vector

3. For each missing document in the Metadata Index:

   - Read the document contents (particularly the table of contents section)
   - Create a new metadata entry with:
     - Document: The policy name without file extension
     - File: The exact filename including extension
     - Description: A concise summary of the policy's purpose
     - Questions Answered: 3 key questions the policy addresses

4. Update the Metadata Index:
   - Add entries for new documents
   - Remove entries for non-existent documents
   - Maintain the existing JSON structure and formatting
   - Ensure all file references exactly match the filenames in Vector

The goal is to maintain an accurate, up-to-date index of all policy documents with meaningful metadata that aids in document discovery and understanding.
