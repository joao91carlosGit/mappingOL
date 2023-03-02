import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ModalNewLayerPageRoutingModule } from './modal-new-layer-routing.module';

import { ModalNewLayerPage } from './modal-new-layer.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ModalNewLayerPageRoutingModule
  ],
  declarations: [ModalNewLayerPage]
})
export class ModalNewLayerPageModule { }
