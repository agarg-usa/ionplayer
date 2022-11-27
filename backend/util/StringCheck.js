const regex = {
	invalidAscii: /[^\x20-\x7e]/g,
	invalidUnicode: /\p{C}/gu
};

module.exports = {
	isString(...strings){
		for(const string of strings)
			if(typeof string != 'string')
				return false;
		return true;
	},

	hasNonPrintableAscii(...strings){
		for(const string of strings)
			if(regex.invalidAscii.test(string))
				return true;
		return false;
	},

	replaceNonPrintableAscii(string){
		return string.replaceAll(regex.invalidAscii, '');
	},

	hasNonPrintableUnicode(...strings){
		/* no real use in testing if unicode printable, too many characters to even know
		for(const string of strings)
			if(regex.invalidUnicode.test(string))
				return true; */
		return false;
	},

	replaceNonPrintableUnicode(string){
		return string.replaceAll(regex.invalidUnicode, '');
	},

	isValidEmail(string){
		const pi = string.lastIndexOf('.'),
			ai = string.indexOf('@');
		if(ai < 1 || pi <= ai + 1 || pi + 1 == string.length)
			return false;
		return true;
	}
}