import { Injectable } from '@angular/core';
import { LoadingController } from '@ionic/angular';
import { File } from '@ionic-native/file/ngx';
import { Subject } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Injectable({
	providedIn: 'root'
})
export class LayersServiceService {

	public downloadWasCanceled: boolean = false;
	public cancelTripwire = new Subject<void>();

	constructor(

		private loadingController: LoadingController,
		private file: File,
		private http: HttpClient

	) { }

	/** Save new offline basemap data in storage */
	saveBasemapInStorage(arrayToDownload: Object[]): Promise<void> {
		this.downloadWasCanceled = false;
		return this.loadingController.create({
			message: 'Analisando e preparando dados selecionados para download...',
		}).then(prepareLoading => {
			prepareLoading.present();
			return this.prepareTilesFolder().then(() => {
				return this.prepareTileToDownload(arrayToDownload).then(_ => {
					prepareLoading.dismiss();
					return this.downloadTiles(arrayToDownload).then(() => {
						return
					});
				});
			})
		})
	}

	/** Get the array of tile coordinates and return an array of modified objects */
	getXYZ(elements: Object[]): Object[] {
		let output: Object[] = [];
		for (let element of elements) {
			// Get data from URL
			let image_extension = element['url'].split('.').pop();
			if (image_extension.includes('jpeg')) {
				image_extension = '.jpeg';
			}
			if (image_extension.includes('png')) {
				image_extension = '.png';
			}

			let encodedURI = encodeURI(element['url']);

			let x: string = element['tileCoord'][0].toString();
			let y: string = element['tileCoord'][1].toString();

			// Convert to positive, then to string, then add extension
			let z: string = Math.abs(element['tileCoord'][2]).toString() + image_extension;
			//let z: string = (Math.abs(element['tileCoord'][2]) - 1).toString() + image_extension;

			let obj = { x: x, y: y, z: z, encodedURI: encodedURI };
			output.push(obj);
		}
		return output;
	}

	prepareTilesFolder(): Promise<void> {
		// Check if folder exist, remove content + folder and then create a fresh folder
		return this.checkAndCreateDir(this.file.externalDataDirectory, 'offline_tiles').then(() => { });
	}

	/** Return true for success creating/checking, false to problem */
	checkAndCreateDir(path: string, dir: string): Promise<boolean> {
		//return this.file.checkDir(this.file.dataDirectory, 'mydir')
		return this.file.checkDir(path, dir).then(_ => {
			return true;
		}).catch(_ => {
			// Create dir
			return this.file.createDir(path, dir, false).then(_ => {
				return true;
			}).catch(err => {
				if (err.code == 12) { //"PATH_EXISTS_ERR"
					return true
				} else {
					return false
				}
			});
		});
	}

	downloadTiles(arrayToDownload: Object[]) {
		return this.loadingController.create({
			message: 'Realizando download do mapa, você pode cancelar tocando no fundo.',
			backdropDismiss: true
		}).then(downloadLoading => {
			downloadLoading.present();
			downloadLoading.onDidDismiss().then(obj => {
				if (obj.role === 'backdrop') {
					downloadLoading.dismiss();
					this.downloadWasCanceled = true;
				}
			});

			let objects: Object[] = this.getXYZ(arrayToDownload);

			return this.downloadTileFiles(objects).then(tilesResponse => {
				downloadLoading.dismiss();
				if (!this.downloadWasCanceled) {
					return this.saveDownloadedTiles(tilesResponse);
				}
			});
		});
	}

	/** Download tile files and return an array of TileResponse */
	downloadTileFiles(objects): Promise<TileResponse[]> {
		let output: TileResponse[] = [];
		return Promise.all(objects.map(object => {
			return this.http.get(object['encodedURI'], { responseType: 'blob' }).toPromise().then(response => {
				output.push({
					blob: response,
					obj: object
				});
			});
		})).then(_ => {
			return output;
		});
	}

	/** Save downloaded tiles */
	saveDownloadedTiles(tileResponseArray: TileResponse[]): Promise<void> {
		return this.loadingController.create({
			message: 'Salvando os arquivos no seu dispositivo, por favor aguarde.',
		}).then(load => {
			load.present();
			return Promise.all(tileResponseArray.map(tileResponse => {
				let filePath = this.file.externalDataDirectory + 'offline_tiles/' + tileResponse.obj['x'] + '/' + tileResponse.obj['y'] + '/';
				return this.file.writeFile(filePath, tileResponse.obj['z'], tileResponse.blob).catch(error => {
					console.log("Error while saving blob file: ", error);
				});

			})).then(() => {
				load.dismiss();
				return;
			});
		});
	}

	prepareTileToDownload(arrayToDownload: Object[]): Promise<Object> {
		let objects = this.getXYZ(arrayToDownload);
		return Promise.all(objects.map(obj => {
			return this.checkAndCreateDir(this.file.externalDataDirectory + 'offline_tiles/', obj['x']).then(() => {
				return this.checkAndCreateDir(this.file.externalDataDirectory + 'offline_tiles/' + obj['x'] + '/', obj['y']);
			});
		}));
	}
}

interface TileResponse {
	blob: Blob;
	obj: Object;
}