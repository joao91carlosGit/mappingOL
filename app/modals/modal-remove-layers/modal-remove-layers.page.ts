import { Component, OnInit, Input } from '@angular/core';
import { Platform, ModalController } from '@ionic/angular';

import { StorageService } from '../../services/storage-service.service';
import { Layer, LayerBrowser } from '../../services/interfaces.service';
import { UicontrollersService } from '../../services/uicontrollers.service';

@Component({
	selector: 'app-modal-remove-layers',
	templateUrl: './modal-remove-layers.page.html',
	styleUrls: ['./modal-remove-layers.page.scss'],
})
export class ModalRemoveLayersPage implements OnInit {

	@Input() projectId: number;

	public layers: Layer[] = [];
	public layersBrowser: LayerBrowser[] = [];

	constructor(
		public platform: Platform,
		private storageService: StorageService,
		private modalController: ModalController,
		private uicontrollers: UicontrollersService 
	) { }

	ngOnInit() {
		this.loadLayers();
	}

	/** Load all layers on the platform */
	loadLayers(): void {
		if (this.platform.is('cordova')) {
			this.storageService.fetchByAnotherValue('layers', this.projectId, 'projectId').then(data => {
				this.layers = data;
			});
		} else {
			this.storageService.fetchByAnotherValue('layersBrowser', this.projectId, 'projectId').then(data => {
				this.layersBrowser = data;
			});
		}
	}

	/** Confirm before delete */
	deleteLayerConfirm(id: number): void {
		this.uicontrollers.presentAlertConfirm('Atenção!', 'Você tem certeza que deseja deletar essa camada?').then(confirm => {
			if (confirm) {
				this.deleteLayer(id);
			}
		});
	}

	/** Delete selected layer */
	deleteLayer(id: number): void {
		if (this.platform.is('cordova')) {
			this.storageService.deleteData('layers', id).then(_ => {
				this.uicontrollers.presentToast('Camada deletada com sucesso');
				this.loadLayers();
			});
		} else {
			this.storageService.deleteData('layersBrowser', id).then(_ => {
				this.uicontrollers.presentToast('Camada deletada com sucesso');
				this.loadLayers();
			});
		}
	}

	/** Closes modal */
	closeModal(): void {
		this.modalController.dismiss();
	}
}