import { Component, Input, ElementRef, ViewChild } from '@angular/core';

import { ModalController, Platform, LoadingController } from '@ionic/angular';

import { FileChooser } from '@ionic-native/file-chooser/ngx';
import { Entry, File as IonicFile } from '@ionic-native/file/ngx';
import { Zip } from '@ionic-native/zip/ngx';
import { FilePath } from '@ionic-native/file-path/ngx';

import { Layer } from '../../services/interfaces.service';
import { LayerBrowser } from '../../services/interfaces.service';
import { Project } from '../../services/interfaces.service';
import { StorageService } from '../../services/storage-service.service';
import { GeneralService } from '../../services/general.service';
import { UicontrollersService } from 'src/app/services/uicontrollers.service';

import { Vector as VectorSource } from 'ol/source.js';
import KML from 'ol/format/KML';
import { Polygon } from 'ol/geom.js';
import LineString from 'ol/geom/LineString';
import Point from 'ol/geom/Point';
import PolygonGeometry from 'ol/geom/Polygon';
import MultiPolygon from 'ol/geom/MultiPolygon';

import * as JSZIP from 'jszip/dist/jszip.js';

import { Plugins, FilesystemEncoding } from '@capacitor/core';
const { Filesystem } = Plugins;

@Component({
	selector: 'app-modal-new-layer',
	templateUrl: './modal-new-layer.page.html',
	styleUrls: ['./modal-new-layer.page.scss'],
})
export class ModalNewLayerPage {

	@Input() projectId: number;

	@ViewChild('hiddenFileInput') hiddenFileInput: ElementRef;

	public layerName: string;
	public buttonNewLayer: boolean = true;

	private layerColor: string = "3df50f";
	private fileURI: string;
	private layerGeometry: string;
	private fileFullPath: string;
	private browserFile: File;
	private projectLayers: [] = [];

	private zip = new JSZIP();

	constructor(
		private fileChooser: FileChooser,
		private modalController: ModalController,
		private platform: Platform,
		private storageService: StorageService,
		private generalService: GeneralService,
		private file: IonicFile,
		private zipIon: Zip,
		private filePath: FilePath,
		private uicontrollers: UicontrollersService,
		private loading: LoadingController
	) { }

	// Função para simular o click no input file
	selectFile(): Promise<void> {
		if (this.platform.is('cordova')) {
			return this.fileChooser.open().then(uri => {
				return this.filePath.resolveNativePath(uri).then(uri => {
					let filename = uri.split('/').pop();
					this.layerName = filename;
					this.fileURI = uri;
				});
			});
		} else {
			// simulando o click no input file que está invisível
			this.hiddenFileInput.nativeElement.click();
		}
	}

	/** Função para reconhecer e alterar o input file no navegador */
	detectInputFileForBrowser(): void {
		let inputFile = this.hiddenFileInput.nativeElement.files[0].name;
		this.layerName = inputFile
		this.browserFile = this.hiddenFileInput.nativeElement.files[0];
	}

	/** 
		  Função para verificar o nome da camada retornando esperando o retorno da função verifyLayerName()
		  Caso o retorno seja true desabilita o botão pra salvar
		  Caso o retorno seja false habilita o botão pra salvar
	 */
	verifyName(): void {
		let value = this.verifyLayerName(this.layerName);

		if (value === false && this.layerName.length > 0) {
			this.buttonNewLayer = false;

		} else if (value === true) {
			this.uicontrollers.presentToast("Esse nome de camada já existe!");
			this.buttonNewLayer = true;

		} else {
			this.buttonNewLayer = true;
		}
	}

	/**
		  Função para verificar o input onde o usuário escreve o nome do layer
		  Caso o nome não exista o retorno é falso
		  Caso o nome exista o retorno é true
	 */
	verifyLayerName(name: string): boolean {
		// Verifica se o projectLayer já foi populado
		if (this.projectLayers.length > 0) {
			return this.projectLayers.some(layer => layer['name'] === name)
		} else {
			return false;
		}
	}

	/** Função pra salvar o layer no celular. */
	saveNewLayer(): Promise<void> {
		return this.loading.create({
			message: 'Aguarde enquanto importamos o arquivo para você'
		}).then(loading => {
			loading.present();
			if (this.platform.is('cordova')) {
				let decodeURI = decodeURIComponent(this.fileURI);
				let file_dir_path = decodeURI.substr(0, decodeURI.lastIndexOf('/')) + '/';
				let file_name = decodeURI.split('/').pop();
				let file_extension = file_name.split('.').pop();

				let file_extension_lower = file_extension.toLowerCase();

				if (file_extension_lower !== 'kmz' && file_extension_lower !== 'kml') {
					this.uicontrollers.presentToast("O arquivo selecionado não é um arquivo válido " + file_extension_lower);
					return loading.dismiss().then(_ => { 
						return; 
					});
				}

				if (file_extension_lower === 'kml') {
					// Validação do arquivo
					return this.validateKML(file_dir_path, file_name).then(kml => {
						return this.saveKmlFile(kml).then(_ => {
							this.uicontrollers.presentToast('Camada salva com sucesso.');
							this.modalController.dismiss();
							return loading.dismiss().then(_ => {
								return;
							});
						});
					});

				} else {
					// Criando um diretório temporário
					return this.checkAndCreateDir(file_dir_path, 'dir').then(_ => {
						// Unzip e checa o arquivo
						return this.unzipAndCheckKml(file_dir_path + file_name, file_dir_path, 'dir').then(fileEntry => {
							// Remove o nome do arquivo do caminho
							let new_file_dir_path = fileEntry.nativeURL.substr(0, fileEntry.nativeURL.lastIndexOf('/')) + '/';
							return this.validateKML(new_file_dir_path, fileEntry.name).then(kml => {
								return this.saveUnzipKmlFile(kml, fileEntry.name, file_dir_path).then(_ => {
									// Remove o diretório temporário
									return this.file.removeRecursively(file_dir_path, 'dir').then(_ => {
										this.fileFullPath = file_dir_path + fileEntry.name
										// Salva o dado no storage
										return this.saveDataInStorage().then(_ => {
											// Fecha o modal
											this.uicontrollers.presentToast('Camada salva com sucesso.');
											this.modalController.dismiss();
											return loading.dismiss().then(_ => {
												return;
											});
										});
									});
								});
							});
						});
					});
				}
			} else {
				// Salvando dados no browser
				return this.saveNewLayerInBrowser().then(_ => {
					return loading.dismiss().then(_ => {
						return;
					});
				});
			}
		});
	}

	/** Salva o layer no storage do browser. */
	saveNewLayerInBrowser(): Promise<void> {
		// Capturando o nome do arquivo
		let file_name = this.browserFile.name;
		let file_extension: string = file_name.split('.').pop();
		// Verificando a extensão do arquivo
		if (file_extension !== 'kml' && file_extension !== 'kmz') {
			this.uicontrollers.presentToast("O arquivo selecionado não é válido! " + file_extension);
			return;
			// Validando e salvando caso seja um arquivo kml
		} else if (file_extension === 'kml') {
			return this.readInsideFileBrowser().then(fileAsText => {
				return this.validateAndUploadKMLBrowser(fileAsText).then(() => {
					// Fecha o modal
					this.uicontrollers.presentToast('Camada salva com sucesso.');
					this.modalController.dismiss();
				});
			});
		} else {
			return this.unzipAndCheckKmlInBrowser().then(content => {
				return this.validateAndUploadKMLBrowser(content).then(() => {
					// Fecha o modal
					this.uicontrollers.presentToast('Camada salva com sucesso.');
					this.modalController.dismiss();
				});
			});
		}
	}

	/** Valida o arquivo Kml enviado pelo browser */
	validateAndUploadKMLBrowser(fileAsText: string): Promise<void> {
		// valida as coordenadas
		if (!fileAsText.includes('<coordinates>') && !fileAsText.includes('<gx:coord>')) {
			this.uicontrollers.presentToast("O arquivo KML selecionado não possui coordenadas!");
			return;

			// Check for correct projection (WGS84 EPSG:4326)
		} else if (!this.checkProjection(fileAsText)) {
			this.uicontrollers.presentToast("O arquivo selecionado não parece estar na projeção correta!");
			return;

		} else {
			// Check duplicate Ids				
			return this.checkDuplicateIds(fileAsText).then(fileAsText => {
				// Get file geometry
				this.getFileGeometry(fileAsText);

				// Get main color
				this.getMainColor(fileAsText);

				// Change decrypted files references (yellowpin)
				fileAsText = fileAsText.replace(/<href>(|\n|\r\n)http:\//gm, "<href>https:/");
				fileAsText = fileAsText.replace(/http:\/\/maps/gm, "https://maps");

				// Remove IconStyle, if any exist (NOT SUPPORTING CUSTOM ICONS)
				fileAsText = fileAsText.replace(/<IconStyle>.*?<\/IconStyle>/gms, '<IconStyle><Icon><href>https://maps.google.com/mapfiles/kml/pushpin/ylw-pushpin.png</href></Icon><scale>0.6</scale></IconStyle>');

				// Update file in DB, send output as text and create the file in server with PHP 
				return this.saveDataInStorageInBrowser(fileAsText).then(_ => {
					this.storageService.fetch('project', this.projectId).then(result => {
						if (result.coordinates == null || result.coordinates == undefined || result.coordinates.length == 0) {
							this.updateProjectCoordinates(fileAsText)
						}
					});
				});
			});
		}
	}

	/** Descompacta o arquivo kmz no browser */
	unzipAndCheckKmlInBrowser(): Promise<string> {
		return new Promise((resolve, reject) => {
			let reader = new FileReader();
			reader.onloadend = _ => {
				this.zip.loadAsync(reader.result).then(zip => {
					for (let filename in zip.files) {
						// Get name of first KML file (ZipObject first entry)
						if (filename.includes('kml')) {
							return zip.file(filename).async("text");
						}
					}
				}).then(content => {
					resolve(content);
				});
			}
			reader.onerror = _ => {
				reject();
			}
			reader.readAsArrayBuffer(this.browserFile);
		});
	}

	/** Lê o arquivo kml vindo do browser. */
	readInsideFileBrowser(): Promise<string> {
		return new Promise((resolve, reject) => {
			let fileAsText: string = '';
			let reader = new FileReader();
			reader.onloadend = _ => {
				fileAsText = reader.result as string;
				resolve(fileAsText);
			}
			reader.onerror = _ => {
				reject();
			}
			reader.readAsText(this.browserFile);
		});
	}

	/** Checa se o arquivo Kml tem as coordenadas certas. */
	validateKML(file_dir_path, file_name): Promise<string> {
		return Filesystem.readFile({
			path: file_dir_path + file_name
		}).then(fileAs64 => {
			// Converte o arquivo em string
			let convertedXml = atob(fileAs64['data']);
			// Validando as coordenadas
			if (!convertedXml.includes('<coordinates>') && !convertedXml.includes('<gx:coord>')) {
				this.uicontrollers.presentToast('O arquivo KML selecionado não possui as coordenadas');
				return;

				// Checando se o arquivo KML está na projeção correta (WGS84 EPSG:4326)
			} else if (!this.checkProjection(convertedXml)) {
				this.uicontrollers.presentToast('O arquivo KML selecionado não está na projeção correta');
				return;

			} else {
				// Checa se há id's duplicados
				return this.checkDuplicateIds(convertedXml).then(fileAsText => {
					// Captura a geometria do arquivo
					this.getFileGeometry(fileAsText);

					// Captura a cor principal do arquivo
					this.getMainColor(fileAsText);

					// Muda os arquivos para um formato descriptografado (yellowpin)
					fileAsText = fileAsText.replace(/<href>(|\n|\r\n)http:\//gm, "<href>https:/");
					fileAsText = fileAsText.replace(/http:\/\/maps/gm, "https://maps");

					this.fileFullPath = file_dir_path + file_name;

					return fileAsText;
				});

			}

		});
	}

	/** Salva o arquivo KLM */
	saveKmlFile(kmlInfo): Promise<void> {
		// Salva no local storage
		return this.saveDataInStorage().then(_ => {
			// Procura pelo projeto em questão para atualizar as coordenadas
			this.storageService.fetch('project', this.projectId).then(result => {
				if (result.coordinates == null || result.coordinates == undefined || result.coordinates.length == 0) {
					this.updateProjectCoordinates(kmlInfo);
				}
			});
		});
	}

	/** Salva o kml que estava dentro do kmz */
	saveUnzipKmlFile(kmlInfo, file_name, file_dir_path): Promise<void> {
		this.filePath = file_dir_path + file_name;
		// Cria o arquivo fora do diretório temporário
		return Filesystem.writeFile({
			path: file_dir_path + file_name,
			data: kmlInfo,
			encoding: FilesystemEncoding.UTF8
		}).then(_ => {
			this.storageService.fetch('project', this.projectId).then(result => {
				if (result.coordinates == null || result.coordinates == undefined || result.coordinates.length == 0) {
					this.updateProjectCoordinates(kmlInfo);
				}
			});
		});
	}

	/** Retorna true se o arquivo KML tem a coordenada de WGS84 EPSG:4326, senão retorna false. */
	checkProjection(fileAsText: string): boolean {
		if (!fileAsText.includes('<coordinates>')) { // esperado <gx:coord>
			return true;
		}

		let output: boolean = false;
		let patt = /<coordinates>((.|\n|\r\n)*?)\./m;
		let result: string = fileAsText.match(patt)[1];
		result = result.replace(/(\r\n|\n|\r)/gm, "");
		result = result.replace(/ /gm, "");
		result = result.replace(/	/gm, "");
		result = result.replace(/-/gm, "");

		// max char 3 e min menor que 181
		if (result.length < 4 && parseInt(result) <= 180) {
			output = true;
		}

		return output;
	}

	/** Checa id's duplicados*/
	checkDuplicateIds(file: string): Promise<string> {
		return new Promise((resolve, reject) => {
			// Verifica a Placemark tag
			if (file.includes('<Placemark')) {
				// Captura as ocorrências da string
				let numOfPlacemarks = (file.match(/<Placemark/g) || []).length;
				let tempIndex = 0;

				for (let i = numOfPlacemarks - 1; i >= 0; i--) {
					// Verifica se a tag tem id
					let tagIndex = file.indexOf('<Placemark', tempIndex);
					tempIndex = tagIndex + 10;
					let idIndex = file.indexOf('id="', tagIndex);

					if (idIndex == -1) {
						// Para o loop caso não tenha mais id's
						break;
					}

					// Caso o id vá muito longe do Placemark
					if (idIndex - tagIndex > 50) {
						// Pula pro próximo
						continue;

					} else {
						// Pega o id da tag
						let finalIdIndex = file.indexOf('"', idIndex + 4); // Depois id="
						let id = file.slice(idIndex + 4, finalIdIndex); // Apenas o elemento dentro da tag

						// Checa se tem mais um id
						let findIdRegex = new RegExp(id, "g");
						if ((file.match(findIdRegex) || []).length > 0) {
							// Edita esse id
							let uniqId = Date.now().toString();
							let replaceIdRegex = new RegExp(id, ''); // Remove a opção global pra substituir apenas a primeira
							file = file.replace(replaceIdRegex, uniqId);
						}
					}
				}

				resolve(file);
			} else {
				resolve(file);
			}
		});
	}

	/** Captura a geometria do arquivo */
	getFileGeometry(fileAsText: string): void {
		let geometries: string[] = [];
		let numOfLines = (fileAsText.match(/<LineString>/g) || []).length;
		let numOfPoints = (fileAsText.match(/<Point>/g) || []).length;
		let numOfPolygons = (fileAsText.match(/<Polygon>/g) || []).length;

		for (let i = numOfLines - 1; i >= 0; i--) {
			geometries.push('line');
		}

		for (let i = numOfPoints - 1; i >= 0; i--) {
			geometries.push('point');
		}

		for (let i = numOfPolygons - 1; i >= 0; i--) {
			geometries.push('polygon');
		}

		if (geometries.length > 0) {
			if (geometries.length === 1) {
				this.layerGeometry = geometries[0];
			} else {
				this.layerGeometry = 'multi';
			}

		} else {
			// Error
			this.layerGeometry = 'point';
		}
	}

	/** Captura a cor Principal */
	getMainColor(fileAsText): void {
		let fIndex: number, nIndex: number, colorCode: string;
		if (this.layerGeometry === 'point') {
			if (fileAsText.includes('<Icon>')) {
				fIndex = fileAsText.indexOf('<Icon>');
				nIndex = fileAsText.indexOf('color="', fIndex) + 6;
				colorCode = fileAsText.slice(nIndex, nIndex + 6); // RGB
				this.layerColor = colorCode; // RGB
			} else {
				this.layerColor = '3df50f'; // Cor verde padrão
			}
		} else if (this.layerGeometry == 'line') {
			if (fileAsText.includes('<LineStyle>')) {
				fIndex = fileAsText.indexOf("<LineStyle>");
				nIndex = fileAsText.indexOf("<color>", fIndex) + 7;
				colorCode = fileAsText.slice(nIndex, nIndex + 8); // ABGR
				colorCode = this.abgrToRgb(colorCode);
				this.layerColor = colorCode; // RGB

			} else {
				this.layerColor = '3df50f'; // Cor verde padrão
			}
		} else if (this.layerGeometry === 'polygon') {
			if (fileAsText.includes('<PolyStyle>')) {
				fIndex = fileAsText.indexOf("<PolyStyle>");
				nIndex = fileAsText.indexOf("<color>", fIndex) + 7;
				colorCode = fileAsText.slice(nIndex, nIndex + 8); // ABGR
				colorCode = this.abgrToRgb(colorCode);
				this.layerColor = colorCode; // RGB

			} else {
				this.layerColor = '3df50f'; // Cor verde padrão
			}
		} else {
			if (fileAsText.includes('<LineStyle>')) {
				fIndex = fileAsText.indexOf("<LineStyle>");
				nIndex = fileAsText.indexOf("<color>", fIndex) + 7;
				colorCode = fileAsText.slice(nIndex, nIndex + 8); // ABGR
				colorCode = this.abgrToRgb(colorCode);
				this.layerColor = colorCode; // RGB

			} else if (fileAsText.includes('<PolyStyle>')) {
				fIndex = fileAsText.indexOf("<PolyStyle>");
				nIndex = fileAsText.indexOf("<color>", fIndex) + 7;
				colorCode = fileAsText.slice(nIndex, nIndex + 8); // ABGR
				colorCode = this.abgrToRgb(colorCode);
				this.layerColor = colorCode; // RGB

			} else {
				this.layerColor = '3df50f'; // Cor verde padrão
			}
		}
	}

	/** Passar cor de ABGR para RGB */
	abgrToRgb(code: string): string {
		if (code.length > 8) {
			const noAlpha = code.slice(2);
			let r = noAlpha.slice(4);
			let g = noAlpha.slice(2, 4);
			let b = noAlpha.slice(0, 2);
			let res = r + g + b;

			return res;

		} else {
			return '3df50f'; // cor padrão
		}
	}

	/** Salva as coordenadas no storage */
	saveDataInStorage(): Promise<void> {
		return this.storageService.makeNewId('layers').then(id => {

			let layer: Layer = {
				id: id,
				projectId: this.projectId,
				name: this.layerName,
				path: this.fileFullPath,
				date: this.generalService.getDate(),
				visibility: true
			}

			this.storageService.insert('layers', layer).then(_ => {
				this.layerName = '';
			})
		});
	}

	/** Salvar dados no browser */
	saveDataInStorageInBrowser(fileAsText: string): Promise<void> {
		return this.storageService.makeNewId('layersBrowser').then(id => {

			let layerBrowser: LayerBrowser = {
				id: id,
				projectId: this.projectId,
				name: this.layerName,
				data: fileAsText,
				date: this.generalService.getDate(),
				visibility: true,
			}

			this.storageService.insert('layersBrowser', layerBrowser);
		});
	}

	/** Atualiza as coordenadas do projeto */
	updateProjectCoordinates(fileAsText): Promise<void> {
		return new Promise(resolve => {
			let vectorSource = new VectorSource({});
			vectorSource.addFeatures(new KML({}).readFeatures(fileAsText));
			let feature = vectorSource.getFeatures()[0];
			let type = feature.getGeometry().getType();
			let projectCoordinates: number[] = [];

			if (type === 'Polygon') {
				let polygon = feature.getGeometry() as PolygonGeometry;
				projectCoordinates = polygon.getInteriorPoint().getCoordinates();

			} else if (type === 'LineString') {
				let lineString = feature.getGeometry() as LineString;
				projectCoordinates = lineString.getCoordinateAt(0.5);

			} else if (type === 'Point') {
				let point = feature.getGeometry() as Point;
				projectCoordinates = point.getCoordinates();

			} else if (type === 'MultiPolygon') {
				let multiPolygon = feature.getGeometry() as MultiPolygon;
				let coordinates = multiPolygon.getInteriorPoints().getCoordinates();
				/* close the ring and get overall interior point */
				projectCoordinates = new Polygon([coordinates.concat([coordinates[0]])]).getInteriorPoint().getCoordinates();
			}

			return this.storageService.fetch('project', this.projectId).then(result => {
				if (result.coordinates, length > 0) {
					return result;
				} else {
					let project: Project = {
						id: this.projectId,
						project: result.project,
						date: this.generalService.getDate(),
						coordinates: projectCoordinates,
						map: result.map,
						zoom: result.zoom
					}
					let infoChange: any[] = [];
					infoChange.push(project);
					return this.storageService.update('project', this.projectId, infoChange).then(_ => {
						resolve();
					})
				}
			});
		});
	}

	/**
		  Retorna verdadeiro se for criado e checado o diretório
		  Retorna falso caso não crie
		  Checa a a existência de outras pastas, e cria novas
	 */
	checkAndCreateDir(path: string, dir: string): Promise<boolean> {
		return this.file.checkDir(path, dir).then(_ => {
			return true;
		}).catch(e => {
			// Cria o diretório
			return this.file.createDir(path, dir, false).then(_ => {
				return true;
			}).catch(e => {
				if (e.code == 12) { // "PATH_EXISTS_ERR"
					return true;
				} else {
					return false;
				}
			});
		});
	}

	/** Retorna uma Entry do tipo kml de dentro do kmz	 */
	unzipAndCheckKml(zipFilePath: string, extractionPath: string, extractionFolder: string): Promise<Entry> {
		return this.zipIon.unzip(zipFilePath, extractionPath + extractionFolder).then(result => {
			return this.file.listDir(extractionPath, extractionFolder).then(entryList => {
				return entryList.find(fileEntry => {
					let fileExtension = fileEntry.name.split(".").pop();
					return fileExtension === "kml";
				});
			});
		});
	}

	// Função para fechar o modal
	closeModal() {
		this.modalController.dismiss();
	}
}