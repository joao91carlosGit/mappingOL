import { Injectable, SkipSelf } from '@angular/core';
import { DatePipe } from '@angular/common';

@Injectable({
	providedIn: 'root'
})
export class GeneralService {

	constructor(
		private datePipe: DatePipe
	) { }

	// Captura a data atual, formata e retorna como string: 'yyyyMMddHHmmss'
	getDate() : string {
		let now = new Date();
		let dateAsString = this.datePipe.transform(now, 'yyyyMMddHHmmss')
		return dateAsString;
	}

	/** 
	Convert datestring to date, 
	ex: 20201012150000 -> 12/10/2020 15:00:00
	*/
	stringToDate(datestring:string): string {
		let year = datestring.substring(0,4),
			month = datestring.substring(4,6),
			day = datestring.substring(6,8),
			hour = datestring.substring(8,10),
			minute = datestring.substring(10,12),
			second = datestring.substring(12,14);
    
    	return day+"/"+month+"/"+year+" "+hour+":"+minute+":"+second;
	}

	/** Convert a RGB or RGBA value in hexadecimal format */
	convertRgbInHex(r:number, g:number, b:number, a?:number): string {
		let hex:string = 
			(r | 1 << 8).toString(16).slice(1) +
    		(g | 1 << 8).toString(16).slice(1) +
    		(b | 1 << 8).toString(16).slice(1);

		if (a !== null && a !== undefined) {
			let aText: string
			aText = ((a * 255) | 1 << 8).toString(16).slice(1);
			hex = hex + aText;
		}

		return '#' + hex;
	}

	/** Invert a Hex code */
	invertHex(hex: string): string {
		hex = hex.replace('#', '');
		let a: string = hex.slice(6);
		let b: string = hex.slice(4, 6);
		let g: string = hex.slice(2, 4);
		let r: string = hex.slice(0, 2);
		let newHex: string = a + b + g + r;

		if (hex.length === 6) {
			return '#ff' + newHex;
		} else {
			return '#' + newHex
		}
	}

}