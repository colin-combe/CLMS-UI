var xiNET={Controller:function(){this.xiNET_storage=new xiNET_Storage(this);this.clear()}};xiNET.Controller.prototype.clear=function(){this.proteins=new Map;this.proteinLinks=new Map;this.crossLinks=new Map;this.matches=[];this.subgraphs=[];this.proteinCount=0};xiNET.Controller.prototype.linkSelectionChanged=function(){for(var a=this.linkSelectionCallbacks,c=a.length,b=0;b<c;b++)a[b](this.selectedLinks)};
xiNET.Controller.prototype.linkHighlightsChanged=function(a){for(var c=this.linkHighlightsCallbacks,b=c.length,d=0;d<b;d++)c[d](a)};xiNET.Controller.prototype.legendChanged=function(){for(var a=this.legendCallbacks,c=a.length,b=0;b<c;b++)a[b](this.linkColours,this.domainColours)};xiNET.Controller.prototype.clearSelection=function(){for(var a=this.selectedLinks.values(),c=a.length,b=0;b<c;b++)a[b].setSelected(!1)};
xiNET.Controller.prototype.setAnnotations=function(a){function c(){var a=new Set;for(e=0;e<d;e++)for(var c=b[e],l=0;l<c.annotations.length;l++)a.add(c.annotations[l].name);c=a.values().length;3>c&&(c=3);9>c?(c=colorbrewer.Accent[c].slice().reverse(),f.domainColours=d3.scale.ordinal().range(c)):13>c?(c=colorbrewer.Set3[c].slice().reverse(),f.domainColours=d3.scale.ordinal().range(c)):f.domainColours=d3.scale.category20();for(e=0;e<d;e++)for(c=b[e],l=0;l<c.annotations.length;l++){var a=c.annotations[l],
g=f.domainColours(a.name);a.pieSlice.setAttribute("fill",g);a.pieSlice.setAttribute("stroke",g);a.colouredRect.setAttribute("fill",g);a.colouredRect.setAttribute("stroke",g)}f.legendChanged()}this.annotationChoice=a;for(var b=this.proteins.values(),d=b.length,e=0;e<d;e++)b[e].clearPositionalFeatures();this.domainColours=null;this.legendChanged();if(this.sequenceInitComplete){var f=this;if("CUSTOM"===a.toUpperCase()){for(e=0;e<d;e++)a=b[e],a.setPositionalFeatures(a.customAnnotations);c()}else if("LYSINES"===
a.toUpperCase()){for(e=0;e<d;e++){a=b[e];for(var l=a.sequence,g=[],k=0;k<a.size;k++)"K"===l[k]&&g.push(new Annotation("Lysine",k+1,k+1));a.setPositionalFeatures(g)}c()}else if("SUPERFAM"===a.toUpperCase()||"SUPERFAMILY"===a.toUpperCase())for(var h=0,e=0;e<d;e++)a=b[e],this.xiNET_storage.getSuperFamFeatures(a.id,function(a,b){f.proteins.get(a).setPositionalFeatures(b);h++;h===d&&c()});else if("UNIPROT"===a.toUpperCase()||"UNIPROTKB"===a.toUpperCase())for(e=h=0;e<d;e++)a=b[e],this.xiNET_storage.getUniProtFeatures(a.id,
function(a,b){var e=f.proteins.get(a);if(-1===e.accession.indexOf("-")||"P02768-A"===e.accession){if("P02768-A"===e.accession)for(var l=0;l<b.length;l++){var g=b[l];g.start+=-24;g.end+=-24}e.setPositionalFeatures(b)}h++;h===d&&c()})}};
xiNET.Controller.prototype.initProteins=function(){for(var a=this.proteins.values(),c=a.length,b=Protein.MAXSIZE=0;b<c;b++){var d=a[b].size;d>Protein.MAXSIZE&&(Protein.MAXSIZE=d)}Protein.UNITS_PER_RESIDUE=(this.svgElement.parentNode.clientWidth/2-Protein.LABELMAXLENGTH)/Protein.MAXSIZE;for(b=0;b<c;b++)a[b].init();this.sequenceInitComplete=!0;this.annotationSet?xlv.setAnnotations(this.annotationSet):this.setAnnotations("CUSTOM")};
xiNET.Controller.prototype.reset=function(){this.resetZoom();for(var a=this.proteins.values(),c=a.length,b=0;b<c;b++){var d=a[b];!1===d.isParked&&d.setForm(0)}this.autoLayout()};xiNET.Controller.bestId=function(a){return a.accession?a.accession:a.name?a.name:a.id};xiNET.Controller.prototype.addProtein=function(a,c,b,d){c=new Protein(a,this,d,c);c.setSequence(b);this.proteins.set(a,c)};
xiNET.Controller.prototype.addMatch=function(a,c,b,d,e,f,l,g,k,h,q,r,u,x,A){return new Match(this,a,c,b,d,e,f,l,g,k,h,q,r,u,x,A)};xiNET.Controller.prototype.addMatches=function(a){for(var c=a.length,b=0;b<c;b++)this.addMatch(a[b][0],a[b][1],a[b][2],a[b][3],a[b][4],a[b][5],a[b][6],a[b][7],a[b][8],a[b][9],a[b][10],a[b][11],a[b][12],a[b][13],a[b][14],a[b][15])};
xiNET.Controller.prototype.addAnnotation=function(a,c,b,d,e){if(a=this.proteins.get(a)){b=parseInt(b);d=parseInt(d);isNaN(b)&&isNaN(d)?(b=1,d=a.size):isNaN(b)?b=d:isNaN(d)&&(d=b);if(b>d){var f=b;b=d;d=f}c=new Annotation(c,b,d,e);null==a.customAnnotations&&(a.customAnnotations=[]);a.customAnnotations.push(c)}};xiNET.Controller.prototype.addAnnotationByName=function(a,c,b,d,e){for(var f=this.proteins.values(),l=f.length,g=0;g<l;g++){var k=f[g];k.name==a&&this.addAnnotation(k.id,c,b,d,e)}};
xiNET.Controller.prototype.addAnnotations=function(a){a=d3.csv.parseRows(a);for(var c=a[0],b=0;b<c.length;b++)c[b]=c[b].trim();var b=c.indexOf("ProteinId"),d=c.indexOf("AnnotName");-1===d&&(d=c.indexOf("Name"));var e=c.indexOf("StartRes");-1===e&&(e=c.indexOf("StartResidue"));var f=c.indexOf("EndRes");-1===f&&(f=c.indexOf("EndResidue"));var l=c.indexOf("Color");-1===l&&(l=c.indexOf("Colour"));for(var c=a.length,g=1;g<c;g++)this.addAnnotation(a[g][b],a[g][d],a[g][e],a[g][f],a[g][l])};
xiNET.Controller.prototype.setLinkColour=function(a,c){var b=this.proteinLinks.get(a);"undefined"!==typeof b?(b.colour=new RGBColor(c),b.colourSpecified=!0):(b=this.proteins.get(a),"undefined"!==typeof b&&(b.internalLinkColour=new RGBColor(c)))};function Match(a,c,b,d,e,f,l,g,k,h,q,r,u,x,A,z){function B(a){a=a.toString().trim();if("-"!==a&&"n/a"!==a){Match.eliminateQuotes.lastIndex=0;a=a.replace(Match.eliminateQuotes,"");Match.split.lastIndex=0;a=a.split(Match.split);for(var b=a.length,c=0;c<b;c++)a[c]=a[c].trim()}else a=null;return a}function y(a){if(a)if(a=a.toString().trim(),""!==a&&"-"!==a&&"n/a"!==a){Match.eliminateQuotes.lastIndex=0;a=a.toString().replace(Match.eliminateQuotes,"");Match.split.lastIndex=0;a=a.split(Match.split);for(var b=
a.length,c=0;c<b;c++){var d=parseInt(a[c]);isNaN(d)?console.debug("Absurd non-numerical position. Match id:"+D.id+". So-called 'position':"+a[c]):a[c]=d}}else a=null;else a=null;return a}this.id=c.toString().trim();this.controller=a;this.crossLinks=[];this.group=r.toString().trim();Match.groups.add(this.group);A&&(this.runName=A.toString().trim());z&&(this.scanNumber=z.toString().trim());if(q&&(q=parseFloat(q),!isNaN(q)))if(this.score=q,!Match.maxScore||this.score>Match.maxScore)Match.maxScore=this.score;
else if(!Match.minScore||this.score<Match.minScore)Match.minScore=this.score;u&&(u=u.toString().trim(),""!==u&&(this.autovalidated="t"==u||"true"==u||!0===u?!0:!1,Match.autoValidatedFound=!0));x&&(this.validated=x=x.toString().trim(),Match.manualValidatedFound=!0);b=B(b);l=B(l);this.pepSeq1raw=e;this.pepSeq2raw=k;this.pepSeq1=null;e&&(Match.capitalsOnly.lastindex=0,this.pepSeq1=e.replace(Match.capitalsOnly,""));this.pepSeq2=null;k&&(Match.capitalsOnly.lastindex=0,this.pepSeq2=k.replace(Match.capitalsOnly,
""));var D=this;d=y(d);g=y(g);f=y(f);h=y(h);1==d.length&&1==g.length&&(Match.unambigLinkFound=!0);this.productType=null===l&&null===g&&null===h?0:null===l?1:2;var p,s,n,m;if(b){if(0===this.productType)if(null!==d)for(a=0;a<d.length;a++)p=a,p>=b.length&&(p=b.length-1),p=b[p],n=d[a],n+=f[0]-1,this.associateWithLink(p,null,n,null,d[a],this.pepSeq1.length,null,null);else for(a=0;a<f.length;a++)p=a,p>=b.length&&(p=b.length-1),p=b[p],n=f[a],this.associateWithLink(p,null,n,null,null,null,null,null);else if(1===
this.productType)if(null!==d)for(a=0;a<d.length;a++)p=a,p>=b.length&&(p=b.length-1),p=b[p],n=d[a],m=g?g[a]:d[a],null!==f&&(n+=f[0]-1),null!==h&&(m+=h[0]-1),this.associateWithLink(p,null,n,m,d[a],this.pepSeq1.length,null,null);else for(a=0;a<f.length;a++)p=a,p>=b.length&&(p=b.length-1),p=b[p],n=f[0],m=h[0],this.associateWithLink(p,null,n,m,null,null,null,null);else if(null!==d){if(null!==d)for(a=0;a<d.length;a++)for(c=0;c<g.length;c++)p=a,s=c,p>=b.length&&(p=b.length-1),s>=l.length&&(s=l.length-1),
p=b[p],s=l[s],n=d[a]-0,m=g[c]-0,null!==f&&(n+=f-1),null!==h&&(m+=h-1),this.associateWithLink(p,s,n,m,d[a]-0,this.pepSeq1.length,g[c],this.pepSeq2.length)}else for(a=0;a<f.length;a++)for(c=0;c<h.length;c++)p=a,s=c,p>=b.length&&(p=b.length-1),s>=l.length&&(s=l.length-1),p=b[p],s=l[s],n=f[a]-0,m=h[c]-0,this.associateWithLink(p,s,n,m,null,null,null,null);this.confirmedHomomultimer=!1;this.overlap=[];p===s&&(this.pepSeq1&&this.pepSeq2?(p=d[0],s=g[0],m=p+(this.pepSeq1.length-1),n=s+(this.pepSeq2.length-
1),p>=s&&p<=n?(this.confirmedHomomultimer=!0,this.overlap[0]=p-1,this.overlap[1]=m<n?m:n):s>=p&&s<=m&&(this.confirmedHomomultimer=!0,this.overlap[0]=s-1,this.overlap[1]=n<m?n:m)):n===m&&(this.confirmedHomomultimer=!0,this.overlap[0]=n-1,this.overlap[1]=m));this.controller.matches.push(this);this.protein1=b;this.pepPos1=d;this.linkPos1=f;this.protein2=l;this.pepPos2=g;this.linkPos2=h}}Match.groups=new Set;Match.autoValidatedFound=!1;Match.manualValidatedFound=!1;Match.unambigLinkFound=!1;
Match.eliminateQuotes=/(['"])/g;Match.split=/[;,]/g;Match.capitalsOnly=/[^A-Z]/g;
Match.prototype.associateWithLink=function(a,c,b,d,e,f,l,g){var k,h,q;null===c?(h=this.controller.proteins.get(a),null===d?(k=""+a+"-null",q=null):(k=""+a+"-"+a,q=h)):a<=c?(k=""+a+"-"+c,h=this.controller.proteins.get(a),q=null!==c?this.controller.proteins.get(c):null):(k=""+c+"-"+a,h=this.controller.proteins.get(c),q=this.controller.proteins.get(a));var r=this.controller.proteinLinks.get(k);void 0===r&&(void 0!==h&&void 0!==q||alert("Something has gone wrong; a link has been added before a protein it links to. "+
a+"-"+c),r=new ProteinLink(k,h,q,this.controller),this.controller.proteinLinks.set(k,r),h.addLink(r),null!==q&&q.addLink(r));k=!1;a===c||null===c?b-0<d-0||null===d?q=b+"-"+d:(q=d+"-"+b,k=!0):a<c?q=b+"-"+d:(q=d+"-"+b,k=!0);h=r.crossLinks.get(q);void 0===h&&(h=a===c?b-0<d-0||"n/a"===d?new CrossLink(q,r,b,d,this.controller):new CrossLink(q,r,d,b,this.controller):a==r.fromProtein.id?new CrossLink(q,r,b,d,this.controller):new CrossLink(q,r,d,b,this.controller),r.crossLinks.set(q,h),this.controller.crossLinks.set(q,
h),1<this.controller.proteins.keys().length&&(a=r.crossLinks.keys().length,a>ProteinLink.maxNoCrossLinks&&(ProteinLink.maxNoCrossLinks=a)));if("undefined"===typeof h.matches||null==h.matches)h.matches=[];!1===k?h.matches.push([this,e,f,l,g]):h.matches.push([this,l,g,e,f]);this.crossLinks.push(h)};
Match.prototype.meetsFilterCriteria=function(){return this.isAmbig()&&!1===this.controller.ambigShown?!1:"function"==typeof this.controller.filter?this.controller.filter(this):"undefined"!==typeof this.controller.cutOff&&"undefined"!==typeof this.score?this.score>=this.controller.cutOff?!0:!1:!0};Match.prototype.isAmbig=function(){return 1<this.crossLinks.length?!0:!1};function Protein(a,c,b){this.id=a;this.accession=c;this.name=b;this.name=!this.name&&c?c:a;this.proteinLinks=new Map;this.annotatedRegions=this.selfLink=null}
Protein.prototype.setSequence=function(a){/\d/.test(a)&&(this.isotopicLabeling="",-1!==a.indexOf("K4")&&(this.labeling+="K4"),-1!==a.indexOf("K6")&&(this.labeling+="K6"),-1!==a.indexOf("K8")&&(this.labeling+="K8"),-1!==a.indexOf("K10")&&(this.labeling+="R4"),-1!==a.indexOf("R6")&&(this.labeling+="R6"),-1!==a.indexOf("R8")&&(this.labeling+="R8"),-1!==a.indexOf("R10")&&(this.labeling+="R10"));this.sequence=a.replace(/[^A-Z]/g,"")};
Protein.prototype.isDecoy=function(){return this.name?-1===this.name.indexOf("DECOY_")&&"REV"!==this.name?!1:!0:!1};Protein.prototype.addLink=function(a){this.proteinLinks.has(a.id)||this.proteinLinks.set(a.id,a);!0===a.isSelfLink()&&(this.selfLink=a,this.size&&this.selfLink.initSelfLinkSVG());null===a.toProtein&&(this.linkerModifications=a)};
Protein.prototype.countExternalLinks=function(){for(var a=0,c=this.proteinLinks.keys().length,b=0;b<c;b++){var d=this.proteinLinks.values()[b];d.selfLink()||!0===d.check()&&a++}return a};Protein.prototype.getSubgraph=function(a){null==this.subgraph&&(a={nodes:new Map,links:new Map},a.nodes.set(this.id,this),!1===this.isParked&&(this.subgraph=this.addConnectedNodes(a)),this.controller.subgraphs.push(a));return this.subgraph};
Protein.prototype.addConnectedNodes=function(a){for(var c=this.proteinLinks.values(),b=c.length,d=0;d<b;d++){var e=c[d];e.fromProtein===e.toProtein||!0!==e.check()||a.links.has(e.id)||(a.links.set(e.id,e),e=e.getFromProtein()===this?e.getToProtein():e.getFromProtein(),null===e||a.nodes.has(e.id)||(a.nodes.set(e.id,e),e.subgraph=a,e.addConnectedNodes(a)))}return a};function Annotation(a,c,b,d,e){this.name=a;this.start=c-0;this.end=b-0;void 0!==d&&null!==d&&(this.colour=d);this.notes=e};ProteinLink.maxNoCrossLinks=0;function ProteinLink(a,c,b){this.id=a;this.crossLinks=new Map;this.fromProtein=c;this.toProtein=b;this.isSelected=this.ambig=!1}ProteinLink.prototype.isSelfLink=function(){return this.fromProtein===this.toProtein};ProteinLink.prototype.isAmbiguous=function(){return this.ambig};ProteinLink.prototype.hasConfirmedHomomultimer=function(){return this.confirmedHomomultimer};ProteinLink.prototype.getFromProtein=function(){return this.fromProtein};
ProteinLink.prototype.getToProtein=function(){return this.toProtein};ProteinLink.prototype.getFilteredMatches=function(){for(var a=this.crossLinks.values(),c=a.length,b=new Map,d=0;d<c;d++)for(var e=a[d],f=e.matches.length,l=0;l<f;l++){var g=e.matches[l];g.meetsFilterCriteria()&&b.set(g.id)}return b.keys()};
ProteinLink.prototype.check=function(){if(this.fromProtein.isParked||null!==this.toProtein&&this.toProtein.isParked)return this.hide(),!1;if(this.selfLink()&&!1===this.controller.selfLinksShown){if(0===this.fromProtein.form)this.hide();else for(var a=this.crossLinks.values(),c=a.length,b=0;b<c;b++)a[b].hide();return!1}if(this.hidden){if(0===this.fromProtein.form&&null!==this.toProtein&&0===this.toProtein.form)this.hide();else for(a=this.crossLinks.values(),c=a.length,b=0;b<c;b++)a[b].hide();return!1}a=
this.crossLinks.values();c=a.length;this.confirmedHomomultimer=!1;if(0===this.fromProtein.form&&null!==this.toProtein&&0===this.toProtein.form){this.ambig=!0;for(var d=[],e=new Map,f=new Map,b=0;b<c;b++){var l=a[b],g=!1;if(l.matches)for(var k=l.matches.length,h=0;h<k;h++){var q=l.matches[h][0];if(q.meetsFilterCriteria())if(!0===q.hd&&(this.confirmedHomomultimer=!0),!1===g&&(g=!0,d.push(l)),e.set(q.id,q),q.isAmbig())for(var r=0;r<q.crossLinks.length;r++)f.set(q.crossLinks[r].proteinLink.id);else this.ambig=
!1}else d.push(l)}a=d.length;if(0<a)return this.tooltip=this.id+", "+a+" unique cross-link",1<a&&(this.tooltip+="s"),this.tooltip+=" ("+e.keys().length,1===e.keys().length?this.tooltip+=" match)":this.tooltip+=" matches)",this.w=45/ProteinLink.maxNoCrossLinks*a,this.ambig=this.ambig&&1<f.keys().length,this.dashedLine(this.ambig),!0;this.hide();return!1}if(null!==this.toProtein||0!==this.fromProtein.form){e=!1;for(f=0;f<c;f++)!0===a[f].check()&&(e=!0);return e}};
ProteinLink.prototype.getOtherEnd=function(a){return this.fromProtein===a?this.toProtein:this.fromProtein};function CrossLink(a,c,b,d){this.id=a;this.proteinLink=c;this.fromResidue=b;this.toResidue=d;this.ambig=!1}CrossLink.prototype.isSelfLink=function(){return this.proteinLink.fromProtein===this.proteinLink.toProtein};CrossLink.prototype.isAmbiguous=function(){return this.ambig};CrossLink.prototype.hasConfirmedHomomultimer=function(){return this.confirmedHomomultimer};CrossLink.prototype.getFromProtein=function(){return this.proteinLink.fromProtein};CrossLink.prototype.getToProtein=function(){return this.proteinLink.toProtein};
CrossLink.prototype.getFilteredMatches=function(){this.ambig=!0;this.intraMolecular=this.confirmedHomomultimer=!1;for(var a=[],c=this.matches?this.matches.length:0,b=0;b<c;b++){var d=this.matches[b][0];d.meetsFilterCriteria()&&(a.push(this.matches[b]),!1===d.isAmbig()&&(this.ambig=!1),!0===d.hd&&(this.confirmedHomomultimer=!0),1===d.type&&(this.intraMolecular=!0))}return a};
CrossLink.prototype.check=function(a){return!1===this.controller.selfLinkShown&&this.selfLink()||this.proteinLink.hidden?(this.hide(),!1):"undefined"===typeof this.matches||null==this.matches?(this.ambig=!1,this.show(),!0):0<this.getFilteredMatches().length?!0:!1};function xiNET_Storage(a){this.controller=a}xiNET_Storage.ns="xiNET.";xiNET_Storage.accessionFromId=function(a){a+="";return-1!==a.indexOf("|")?a.split("|")[1]:a};
xiNET_Storage.prototype.getUniProtTxt=function(a,c){function b(){d3.text("http://www.uniprot.org/uniprot/"+d+".txt",function(b){"undefined"!==typeof Storage&&localStorage.setItem(xiNET_Storage.ns+"UniProtKB."+d,b);c(a,b)})}var d=this.controller.proteins.get(a).accession;if("undefined"!==typeof Storage){var e=localStorage.getItem(xiNET_Storage.ns+"UniProtKB."+d);e?c(a,e):b()}else b()};
xiNET_Storage.prototype.getSequence=function(a,c){function b(){d3.text("http://www.uniprot.org/uniprot/"+d+".fasta",function(b){var e="";b=b.split("\n");for(var g=b.length,k=1;k<g;k++)var h=b[k],h=b[k],e=e+h;e=e.replace(/[^A-Z]/g,"");"undefined"!==typeof Storage&&localStorage.setItem(xiNET_Storage.ns+"UniProtKB.fasta."+d,e);c(a,e)})}var d=this.controller.proteins.get(a).accession;if("undefined"!==typeof Storage){var e=localStorage.getItem(xiNET_Storage.ns+"UniProtKB.fasta."+d);e?c(a,e):b()}else b()};
xiNET_Storage.prototype.getUniProtFeatures=function(a,c){this.getUniProtTxt(a,function(a,d){var e=[];if(null!==d){for(var f=d.split("\n"),l=f.length,g=0;g<l;g++){var k=f[g];if(0===k.indexOf("FT")&&(k=k.split(/\s{2,}/g),4<k.length&&"DOMAIN"===k[1])){var h=k[4].substring(0,k[4].indexOf("."));e.push(new Annotation(h,k[2],k[3],null,k[4]))}}c(a,e)}})};
xiNET_Storage.prototype.getSuperFamFeatures=function(a,c){function b(){d3.xml("http://supfam.org/SUPERFAMILY/cgi-bin/das/up/features?segment="+e,function(a){a=(new XMLSerializer).serializeToString(a);"undefined"!==typeof Storage&&localStorage.setItem(xiNET_Storage.ns+"SuperFamDAS."+e,a);d(a)})}function d(b){if(window.DOMParser)var d=(new DOMParser).parseFromString(b,"text/xml");else d=new ActiveXObject("Microsoft.XMLDOM"),d.async=!1,d.loadXML(b);b=[];for(var d=d.getElementsByTagName("FEATURE"),e=
d.length,h=0;h<e;h++){var f=d[h],r=f.getElementsByTagName("TYPE")[0];if("miscellaneous"===r.getAttribute("category")){var r=r.getAttribute("id"),u=f.getElementsByTagName("START")[0].textContent,f=f.getElementsByTagName("END")[0].textContent;b.push(new Annotation(r,u,f))}}c(a,b)}var e=this.controller.proteins.get(a).accession;if("undefined"!==typeof Storage){var f=localStorage.getItem(xiNET_Storage.ns+"SuperFamDAS."+e);f?d(f):b()}else b()};xiNET.Controller.prototype.readCSV=function(a,c,b){function d(a){for(var b=1;b<s;b++)for(var c=g[b][a].replace(/(['"])/g,"").split(/[;,]/),d=0;d<c.length;d++){var e=c[d].trim();if("-"!==e.trim()&&"n/a"!==e.trim()){var f,h;if(-1===c[d].indexOf("|"))f=c[d].trim();else{h=c[d].split("|");f=h[1].trim();h=h[2].trim();var k=h.indexOf("_");-1!==k&&(h=h.substring(0,k).trim())}l.proteins.has(e)||(f=new Protein(e,l,f,h),l.proteins.set(e,f))}}}function e(a){var b=a;-1!==a.indexOf("|")&&(a=a.split("|"),3===a.length&&
(b=a[2],a=b.indexOf("_"),-1!==a&&(b=b.substring(0,a))));return b}function f(){for(var a,b,c,d,e=1;e<s;e++){a=g[e][h];b=g[e][r];c=-1!==A?g[e][A]:e;-1!==x&&(d=g[e][x]);var f=/(.*)-(.*)-a(\d*)-b(\d*)/.exec(c),k=/(.*)-(.*)-(.*)/.exec(c);if(null!==f){for(var m=f[1],k=f[2],n=f[3]-0,v=f[4]-0,f=g[e][z].toString().split(/[;,]/),t=0;t<f.length;t++)f[t]=parseInt(f[t])-n+1;for(var w=g[e][y].toString().split(/[;,]/),t=0;t<w.length;t++)w[t]=parseInt(w[t])-v+1;l.addMatch(c,a,f.join(";"),m,n,b,w.join(";"),k,v,d)}else if(-1===
p||null===k||"intralink"!==g[e][p]&&"monolink"!==g[e][p])f=g[e],l.addMatch(c,a,f[q],f[B],f[z],b,f[u],f[D],f[y],d);else{m=k[1];n=parseInt(k[2].substring(1));f=g[e][z].toString().split(/[;,]/);for(t=0;t<f.length;t++)f[t]=parseInt(f[t])-n+1;"intralink"===g[e][p]?(v=parseInt(k[3].substring(1)),l.addMatch(c,a,f.join(";"),m,n,null,null,null,v,d)):l.addMatch(c,a,f.join(";"),m,n,null,null,null,null,d)}}}var l=this,g=d3.csv.parseRows(a);a=g[0];for(var k=0;k<a.length;k++)a[k]=a[k].trim();var h=a.indexOf("Protein1"),
q=a.indexOf("PepPos1"),r=a.indexOf("Protein2"),u=a.indexOf("PepPos2"),x=a.indexOf("Score"),A=a.indexOf("Id"),z=a.indexOf("LinkPos1"),B=a.indexOf("PepSeq1"),y=a.indexOf("LinkPos2"),D=a.indexOf("PepSeq2"),p=a.indexOf("Type");if(-1===h)alert("Failed to read column 'Protein1' from CSV file");else if(-1===r)alert("Failed to read column 'Protein2' from CSV file");else{if(-1===z&&(z=a.indexOf("AbsPos1"),-1===z)){alert("Failed to read column 'LinkPos1' from CSV file");return}if(-1===y&&(y=a.indexOf("AbsPos2"),
-1===y)){alert("Failed to read column 'LinkPos2' from CSV file");return}-1===x&&(x=a.indexOf("ld-Score"));var s=g.length;if(c){c=c.split("\n");a=null;for(var n,m,k=0;k<c.length;k++){var v=""+c[k];if(0!==v.indexOf(";"))if(0===v.indexOf(">")){if(null!==a){var w=e(a);m=new Protein(a,this,null,w);m.setSequence(n.trim());this.proteins.set(a,m);m=new Protein("decoy_reverse_"+a,this,null,"DECOY_"+w);m.setSequence(n.trim().split("").reverse().join(""));this.proteins.set("decoy_reverse_"+a,m);m=new Protein("reverse_"+
a,this,null,"DECOY_"+w);m.setSequence(n.trim().split("").reverse().join(""));this.proteins.set("reverse_"+a,m);n=""}m=v.indexOf(" ");-1===m&&(m=v.length);a=v.substring(1,m).trim().replace(/(['"])/g,"");v.substring(m).trim()}else n+=v.trim()}w=e(a);m=new Protein(a,this,null,w);m.setSequence(n.trim());this.proteins.set(a,m);m=new Protein("decoy_reverse_"+a,this,null,"DECOY_"+w);m.setSequence(n.trim().split("").reverse().join(""));this.proteins.set("decoy_reverse_"+a,m);m=new Protein("reverse_"+a,this,
null,"DECOY_"+w);m.setSequence(n.trim().split("").reverse().join(""));this.proteins.set("reverse_"+a,m);f();n=this.proteins.values();var C=n.length;for(c=0;c<C;c++)m=n[c],0===m.proteinLinks.keys().length&&this.proteins.remove(m.id);b&&l.addAnnotations(b);l.initProteins()}else{d(h);d(r);n=this.proteins.values();var C=n.length,E=0;for(c=0;c<C;c++)this.xiNET_storage.getSequence(n[c].id,function(a,c){l.proteins.get(a).setSequence(c);E++;E===C&&(b&&l.addAnnotations(b),l.initProteins())});f()}this.initLayout()}};