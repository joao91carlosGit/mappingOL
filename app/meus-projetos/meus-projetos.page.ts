import { Component, OnInit } from '@angular/core';
import { NavigationExtras } from '@angular/router';

import { NavController, LoadingController, Platform } from '@ionic/angular';
import { ModalController } from '@ionic/angular';
import { MenuController } from '@ionic/angular';
import { ActionSheetController } from '@ionic/angular';

import { StorageService } from '../services/storage-service.service';
import { Project, UserFeature } from '../services/interfaces.service';
import { UicontrollersService } from '../services/uicontrollers.service';
import { FilesystemService } from '../services/filesystem.service';
import { DatashareService } from '../services/datashare.service';

import { ModalNewProjectPage } from '../modals/modal-new-project/modal-new-project.page';
import { ModalNewLayerPage } from '../modals/modal-new-layer/modal-new-layer.page';
import { ModalEditProjectPage } from '../modals/modal-edit-project/modal-edit-project.page';
import { ModalRemoveLayersPage } from '../modals/modal-remove-layers/modal-remove-layers.page';

@Component({
	selector: 'app-meus-projetos',
	templateUrl: './meus-projetos.page.html',
	styleUrls: ['./meus-projetos.page.scss'],
})
export class MeusProjetosPage implements OnInit {

	public projects: Project[] = [];
	public offlineMap: boolean;

	constructor(
		private modalController: ModalController,
		private storageService: StorageService,
		private actionSheet: ActionSheetController,
		private menu: MenuController,
		private navController: NavController,
		private uicontrollers: UicontrollersService,
		private loadingController: LoadingController,
		private filesystem: FilesystemService,
		private platform: Platform,
		private datashare: DatashareService
	) { }

	ngOnInit() {
		this.loadProjects();
		this.storageService.fetchAll('offline_basemap').then(data => {
			if (data !== null && data !== undefined) {
				this.offlineMap = true;
			} else {
				this.offlineMap = false;
			}
		});

		// Listen to state of current offline basemap status
		this.datashare.offlineBasemapObservable.subscribe(value => {
			this.offlineMap = value;
		});
	}

	// Abrir Modal
	modalNewProject(): Promise<void> {
		return this.modalController.create({
			component: ModalNewProjectPage,
		}).then((modal) => {
			modal.present();

			// Quando o modal fecha é executada a função para a busca dos projetos novamente
			modal.onDidDismiss().then(_ => {
				this.loadProjects();
			});
		});

	}

	// Procurar pelos projetos no local storage
	loadProjects() {
		this.storageService.fetchAll('project').then((data) => {
			this.projects = data;
		});
	}

	// Abre as opções do botão
	openOptions(id): Promise<void> {
		return this.actionSheet.create({
			header: 'Opções',
			cssClass: 'actionSheet',
			buttons: [{
				text: 'Visualizar',
				icon: 'eye',
				handler: () => {
					this.goToMap(id);
				},
			}, {
				text: 'Editar Projeto',
				icon: 'pencil',
				handler: () => { 
					return this.modalController.create({
						component: ModalEditProjectPage,
						componentProps: {
							'projectId': id
						}
					}).then((modal) => {
						modal.present();
						modal.onDidDismiss().then(_ => {
							this.loadProjects();
						});
					});
				}
			}, {
				text: 'Adicionar Nova Camada',
				icon: 'add-circle',
				handler: () => {
					return this.modalController.create({
						component: ModalNewLayerPage,
						componentProps: {
							'projectId': id
						}
					}).then((modal) => {
						modal.present();
					});
				}
			}, {
				text: 'Remover Camadas',
				icon: 'remove-circle',
				handler: () => { 
					return this.modalController.create({
						component: ModalRemoveLayersPage,
						componentProps: {
							'projectId': id
						}
					}).then(modal => {
						modal.present();
					});
				}
			}, {
				text: 'Remover Projeto',
				icon: 'trash',
				handler: () => { 
					this.confirmRemoveProject(id);
				}
			}, {
				text: 'Cancelar',
				icon: 'close',
				role: 'cancel',
			}],
		}).then((action) => {
			action.present();
		});
	}

	// Navega até a página map passando o id como parâmetro
	goToMap(id) {
		this.storageService.fetch('project', id).then(project => {
			if (project.coordinates.length > 0) {
				let navigationExtras: NavigationExtras = {
					queryParams: {
						id: id,
					}
				}
		
				this.navController.navigateForward('map', navigationExtras);
			} else {
				this.uicontrollers.presentAlertConfirm('Atenção', 'Esse projeto não tem nenhuma coordenada deseja adicionar?').then(confirm => {
					if (confirm) {
						this.modalController.create({
							component: ModalEditProjectPage,
							componentProps: {
								'projectId': id
							}
						}).then((modal) => {
							modal.present();
							modal.onDidDismiss().then(_ => {
								this.loadProjects();
							});
						});
					}
				});
			}
		});
	}

	// Abre o menu lateral
	openMenu() {
		this.menu.enable(true, 'optionMenu');
		this.menu.open('optionMenu');
	}

	// Fecha o menu
	closeMenu() {
		this.menu.close('optionMenu');
	}

	/** Confirma se o usuário deseja remover o projeto */
	confirmRemoveProject(id: number): void {
		this.uicontrollers.presentAlertConfirm('Atenção!', 'Deseja realmente excluir este projeto por inteiro? Após confirmar não há como reverter').then(confirm => {
			if (confirm) {
				this.deleteProject(id);
			}
		});
	}

	/** Deleta todo o projeto */
	deleteProject(id: number): void {
		this.loadingController.create({
			message: 'Deletando projeto aguarde.'
		}).then(prepareLoading => {
			prepareLoading.present();
			this.deleteProjectLayers(id).then(result => {
				if (result) {
					this.deleteProjectPaths(id).then(result => {
						if (result) {
							this.deleteProjectFeatures(id).then(result => {
								if (result) {
									this.storageService.deleteData('project', id).then(_ => {
										let path: string = 'SFMapp/projetos/' + id;
										this.filesystem.checkAndDeleteDir(path).then(_ => {	
											this.loadProjects();
											prepareLoading.dismiss();
											this.uicontrollers.presentToast('Projeto removido com sucesso!');
										});
									});
								}
							})
						}
					});
				}
			});
		});
	}

	/** Deleta as camadas do projeto e retorna uma boolean */
	deleteProjectLayers(id: number): Promise<boolean> {
		if (this.platform.is('cordova')) {
			return this.storageService.fetchByAnotherValue('layers', id, 'projectId').then(data => {
				if (data) {
					for (let i = 0; i < data.length; i++) {
						this.storageService.deleteData('layers', data[i].id)
					}
					return true;
				} else {
					return true;
				}
			});
		} else {
			return this.storageService.fetchByAnotherValue('layersBrowser', id, 'projectId').then(data => {
				if (data) {
					for (let i = 0; i < data.length; i++) {
						this.storageService.deleteData('layersBrowser', data[i].id)
					}
					return true;
				} else {
					return true;
				}
			});
		}
	}

	/** Deleta todos os caminhos do projeto */
	deleteProjectPaths(id: number): Promise<boolean> {
		return this.storageService.fetchByAnotherValue('paths', id, 'projectId').then(data => {
			if (data) {
				for (let i = 0; i < data.length; i++) {
					this.storageService.deleteData('paths', data[i].id);
				}
				return true;
			} else {
				return true;
			}
		});
	}

	/** Deleta as features do projeto */
	deleteProjectFeatures(id: number): Promise<boolean> {
		return this.storageService.fetchAll('features').then(data => {
			if (data) {
				let features: UserFeature[] = data;
				let filteredFeatures: UserFeature[] = features.filter(obj => { obj.id !== id });
				this.storageService.updateKeyValues('features', filteredFeatures);
				return true;
			} else {
				return true;
			}
		})
	}

	/** Deleta todos os mapas baixados */
	deleteAllMaps(): void {
		this.uicontrollers.presentAlertConfirm('Atenção', 'Confirmando isso todos os seus mapas baixados serão deletados, não terá como recuperar esses arquivos você tem certeza disso?').then(confirm => {
			if (confirm) {
				let path : string = 'Android/data/co.sf.sfmapp/files/offline_tiles';
				this.loadingController.create({
					message: 'Deletando arquivos, isto pode demorar um pouco.',
				}).then(loading => {
					this.filesystem.checkAndDeleteDir(path).then(_ => {
						this.storageService.deleteFullData('offline_basemap').then(_ => {
							this.offlineMap = false;
							loading.dismiss();
						});
					});
				});
			}
		});
	}

	/** Aviso para as funções não implementadas */
	warningNotImplemented(): void {
		this.uicontrollers.presentToast('Não implementado ainda.');
	}
}