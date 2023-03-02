import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ModalSelectAreaPageRoutingModule } from './modal-select-area-routing.module';
import { OpenlayersSelectAreaComponent } from '../../components/openlayers-select-area/openlayers-select-area.component'
import { ModalSelectAreaPage } from './modal-select-area.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ModalSelectAreaPageRoutingModule
  ],
  declarations: [
    ModalSelectAreaPage,
    OpenlayersSelectAreaComponent
  ]
})
export class ModalSelectAreaPageModule {}
