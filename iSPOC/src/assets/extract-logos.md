# Extracting MHA Logos

To extract the logos from the image you shared, follow these steps:

## Using an Image Editing Tool (Photoshop, GIMP, etc.)

1. Open the image in your preferred image editing tool
2. For each logo:
   - Select the logo area using a selection tool
   - Copy the selection
   - Create a new file with transparent background
   - Paste the selection
   - Save as PNG with the appropriate filename:
     - `mha-logo-white.png` - Top left logo (white background)
     - `mha-logo-pink.png` - Top right logo (pink background)
     - `mha-logo-blue.png` - Bottom left logo (blue background)
     - `mha-logo-arch.png` - Bottom right logo (white background with pink arch)

## Using Online Tools

If you don't have access to image editing software, you can use online tools:

1. Upload the image to a tool like remove.bg or similar
2. Use the cropping tool to isolate each logo
3. Download each cropped image
4. Rename the files according to the naming convention above

## Alternative Approach

If extracting the logos is challenging, you could:

1. Take screenshots of each logo from the original image
2. Use an online background removal tool if needed
3. Save each image with the appropriate filename

## After Extraction

Once you have the logo files:

1. Place them in the `iSPOC/src/assets/` directory
2. Run the application to see the logos in action
3. Adjust the MHALogo component if needed to ensure proper sizing and alignment
