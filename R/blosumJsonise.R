makeJSONBlosumMatrix = function (blosumRaw, outputFilename, leftCut = 1, topCut = 0) {
  library(stringr)
  library(RJSONIO)
  # let blosumRaw be a table full of spaces as found at http://www.cbcb.umd.edu/confcour/Fall2008/CMSC423-materials/BLOSUM80
  # copy/paste table as variable into r, ignoring first line (the letters)
  blos <- strsplit(blosumRaw,"\n")  # split it by line, now have a list
  bloss <- lapply (blos, str_trim)    # trim whitespace from front/back of each line
  blossc <- lapply (bloss, function (x)  gsub("\\s+", ",", x))  # replace other spacing with commas
  blossMat <- lapply(blossc, function(s) str_split(s,","))    # split the lines in turn by those commas (now have a list of lists)
  blossHeader <- blossMat[[1]]  # first row may be the amino acid abbreviations
  
  # get rid of the first 'leftCut' items in each sublist (usually 1 for the AA letter)
  if (is.numeric(leftCut) && (leftCut > 0)) {
    colCut <- c(1,leftCut)
    blossMat <- lapply(blossMat[[1]], function(s) s[-colCut]) 
  }

  # get rid of the first 'topCut' items in the toplevel list (usually a header of AA abbreviations)
  if (is.numeric(topCut) && (topCut > 0)) {
    rowCut <- c(1,topCut)
    blossMat <- blossMat [-rowCut]
  }
  
  blossMatNum <- lapply(blossMat, strtoi)  # turn them from strings into integers
  blossAlphabet <- paste(blossHeader[[1]], collapse="")
  blossObj <- list(alphabet=blossAlphabet, matrix=blossMatNum)
 
  blossJSON <- toJSON (blossObj) # turn it into a json object
  writeLines (blossJSON, outputFilename, useBytes=T) # write it to a json file
  
  blossHeader[[1]]
}