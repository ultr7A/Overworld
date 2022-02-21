function encrypt (input,key,decrypt) {
	var k = 0,
	   output = "",
	   d=1;
	if (typeof(decrypt)=='undefined') {
		d = 1;
	} else if(decrypt) {
		d =- 1;
	}
	for (i=0; i<input.length; i++) {
		output += String.fromCharCode(input.charCodeAt(i)+d*key.charCodeAt(k));
		k++;
		if (k >= key.length) {
			k = 0;
		}
	}
	return output;
}

