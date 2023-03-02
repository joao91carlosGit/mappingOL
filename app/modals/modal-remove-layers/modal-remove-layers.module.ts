import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ModalRemoveLayersPageRoutingModule } from './modal-remove-layers-routing.module';

import { ModalRemoveLayersPage } from './modal-remove-layers.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ModalRemoveLayersPageRoutingModule
  ],
  declarations: [ModalRemoveLayersPage]
})
export class ModalRemoveLayersPageModule {}
