import { Injectable } from '@angular/core';

import Style from 'ol/style/Style';

@Injectable({
	providedIn: 'root'
})
export class InterfacesService {

	constructor() { }
}

export interface Project {
	id: number;
	project: string;
	date: string;
	coordinates: number[];
	map: string;
	zoom: number;
}

export interface Layer {
	id: number;
	projectId: number;
	name: string;
	path: string;
	date: string;
	visibility: boolean;
}

export interface LayerBrowser {
	id: number;
	projectId: number;
	name: string;
	data: string;
	date: string;
	visibility: boolean;
}

export interface UserFeature {
	id: number;
	projectId: number;
	check: boolean;
	name: string;
	description?: string;
	images?: string[];
	type: string; 
	properties?: featureProperty[];
	coordinates: number[];
	style: Style;
	isGps: boolean;
}

export interface featureProperty {
	id: number;
	idFeature: number;
	name: string;
	value: string | number;
}

export interface Coordinate extends Array<number> {}

export interface PathObj {
	projectId: number,
	userUid: string,
	name: string,
	id: number,
	start_date: string,
	end_date: string,
	coordinates: number[][],
	feature_style: Style
}

export interface LastColors {
	projectId: number,
	color: string,
	select: string
}

export interface MapDetails {
	position: number[];
	zoom: number;
}