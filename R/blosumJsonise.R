makeJSONBlosumMatrix = function (blosumRaw, outputFilename) {
  library(stringr)
  library(RJSONIO)
  # let blosumRaw be a table full of spaces as found at http://www.cbcb.umd.edu/confcour/Fall2008/CMSC423-materials/BLOSUM80
  # copy/paste table as variable into r, ignorinjg first line (the letters)
  blos <- strsplit(blosumRaw,"\n")  # split it by line, now have a list
  bloss <- lapply (blos, str_trim)    # trim whitespace from front/back of each line
  blossc <- lapply (bloss, function (x)  gsub("\\s+", ",", x))  # replace other spacing with commas
  blossMat <- lapply(blossc, function(s) str_split(s,","))    # split the lines in turn by those commas (now have a list of lists)
  blossMat2 <- lapply(blossMat[[1]], function(s) s[-1])   # get rid of the first item in each list (the letter)
  blossMat3 <- lapply(blossMat2, strtoi)  # turn them from strings into integers
  blossJSON <- toJSON (blossMat3) # turn it into a json object
  writeLines (blossJSON, outputFilename, useBytes=T) # write it to a json file
  
  blossJSON
}