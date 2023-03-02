import { Component, OnInit, HostListener } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { DatashareService } from '../../services/datashare.service';
import { Subscription } from 'rxjs';
import { UicontrollersService } from '../../services/uicontrollers.service'

@Component({
	selector: 'app-modal-select-area',
	templateUrl: './modal-select-area.page.html',
	styleUrls: ['./modal-select-area.page.scss'],
})
export class ModalSelectAreaPage implements OnInit {
	public selectedArea: number[] = [];
	private getMapDetailsSubscription: Subscription

	constructor(
		public modalCtrl: ModalController,
		private datashare: DatashareService,
		private uicontrollers: UicontrollersService
	) { }

	ngOnInit() {
		this.getMapDetailsSubscription = this.datashare.getMapDetailsObservable().subscribe(details => {
			this.selectedArea = details.position;
		});
	}

	// Unsubscribe from Subscriptions to avoid duplicates
	ngOnDestroy() {
		this.getMapDetailsSubscription.unsubscribe();
	}

	// Code for dismiss the modal with the Android back button while Ionic Team does not fix it.
	@HostListener('document:ionBackButton', ['$event'])
	private async overrideHardwareBackAction($event: any) {
		await this.modalCtrl.dismiss(['canceled']);
	}

	cancel() {
		this.modalCtrl.dismiss(['canceled']);
	}

	saveSelectedArea(): void {
		this.uicontrollers.presentToast('Nova área selecionada.', 2000);
		this.modalCtrl.dismiss([]);
	}
}