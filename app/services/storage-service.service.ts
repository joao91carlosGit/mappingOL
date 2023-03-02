import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';

@Injectable({
	providedIn: 'root'
})
export class StorageService {

	constructor(
		private storage: Storage
	) { }

	/** Inicia o storage */
	init(): Promise<Storage> {
		return this.storage.create().then(storage => {
			return this.storage = storage;
		})
	}

	/** Insere os dados no storage em form de array de objetos */
	insert(key: string, data: any): Promise<string> {
		return this.storage.get(key).then(result => {
			result = JSON.parse(result);
			if (result) {
				let info: any[] = result;
				info.push(data)
				let infoAsString: string = JSON.stringify(info);
				return this.storage.set(key, infoAsString);
			} else {
				let info: any[] = [];
				info.push(data);
				let infoAsString: string = JSON.stringify(info);
				return this.storage.set(key, infoAsString);
			}
		});
	}

	/** Atualiza um ou mais dados no storage */
	update(key: string, id: number, data: any[]):Promise<void> {
		return this.storage.get(key).then(result => {
			result = JSON.parse(result);
			let newData: any[] = [];
			result.forEach(info => {
				if (info.id === id) {
					newData.push(data[0]);
				} else {
					newData.push(info);
				}
			});
			let newDataAsString: string = JSON.stringify(newData);
			return this.storage.set(key, newDataAsString);
		});
	}

	/** Atualiza por outro valor sem ser id */
	updateByAnotherValue(key: string, value: string | number, data: any[], clausule: string | number): Promise<string> {
		return this.storage.get(key).then(result => {
			result = JSON.parse(result);
			let newData: any[] = [];
			result.map(info => {
				if (info[clausule] === value) {
					newData.push(data[0]);
				} else {
					newData.push(info);
				}
			});
			let newDataAsString: string = JSON.stringify(newData);
			return this.storage.set(key, newDataAsString);
		})
	}

	/** Atualiza todos os dados de uma key no storage */
	updateKeyValues(key: string, data: any[]): Promise<string> {
		let modifiedData = JSON.stringify(data);
		return this.storage.set(key, modifiedData);
	}

	/** Deleta um dado especifico dentro do array */
	deleteData(key: string, id: number): Promise<void> { 
		return this.storage.get(key).then(result => {
			let newData: any[] = [];
			newData = JSON.parse(result)
			newData.forEach(info => {
				if (info.id === id) {
					newData.splice(newData.indexOf(info), 1)
				}
			});
			let newDataAsString: string = JSON.stringify(newData);
			return this.storage.set(key, newDataAsString);
		});
	}

	/** Remove todos os dados do storage correspondentes a uma key */
	deleteFullData(key: string): Promise<void> {
		return this.storage.remove(key);
	}

	/** Remove todos os dados do storage. Usado apenas para testes */
	deleteAll() : Promise<void> {
		return this.storage.clear();
	}

	/**
	 	Procura pelo último id
	 	Caso exista cria um novo id maior que o anterior
	 	caso não exista o id é igual a 1 
	 */ 
	makeNewId(key: string): Promise<number> {	
		return this.storage.get(key).then((result) => {
			result = JSON.parse(result);
			let id: number;
			if (result !== null && result !== undefined) {
				if(result.length > 0) {
					let greaterId: number = Math.max.apply(Math, result.map((value) => {
						return value['id'];
					}));
					id = greaterId + 1;
				} else {
					id = 1;
				}
			} else {
				id = 1;
			}
			return id;
		});
	}
	
	/**
	Procura por todos os dados do local storage
	Retorna um objeto
	*/
	fetchAll(key : string) : Promise<[]> {
		return this.storage.get(key).then(data => {
			return JSON.parse(data);
		});
	}

	/**
	Procura por um dado especifico dentro do storage através do id
	retorna um objeto
	*/
	fetch(key: string, id: number): Promise<any> {
		return this.storage.get(key).then(result => {
			let data = JSON.parse(result);
			if (data !== null) {
				data = data.find(obj => {
					return obj.id == id;
				});
				return data;
			} else {
				return;
			}
		});
	}

	/**
	Procura por um dado especifico dentro do storage que não seja o id
	retorna um objeto
	*/
	fetchByAnotherValue(key: string, value: number | string, clausule: string): Promise<any> {
		return this.storage.get(key).then(result => {
			let data = JSON.parse(result);
			if(data != null) {
				data = data.filter(obj => {
					return obj[clausule] == value;
				});
			} else {
				data = 0;
			}
			return data;
		});
	}

}