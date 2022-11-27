const fs = require('fs').promises;

module.exports = new (class{
	constructor(){
		this.avatars = 'avatars';
	}

	path(path, id, ext){
		return 'cdn/' + path + '/' + id + '.' + ext;
	}

	async create(path, id, ext, data){
		try{
			await fs.writeFile(this.path(path, id, ext), data);
		}catch(e){
			throw new Error('Could not create the file');
		}
	}

	async delete(path, id, ext){
		try{
			await fs.unlink(this.path(path, id, ext));
		}catch(e){
			return e;
		}

		return null;
	}

	async createAvatar(id, ext, data){
		await this.create(this.avatars, id, ext, data);
	}

	async deleteAvatar(id, ext){
		await this.delete(this.avatars, id, ext);
	}
});