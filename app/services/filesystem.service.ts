import { Injectable } from '@angular/core';

import { Plugins, FilesystemDirectory, RmdirResult } from '@capacitor/core';
const { Filesystem } = Plugins;

@Injectable({
	providedIn: 'root'
})
export class FilesystemService {

	constructor(
	) { }

	/** Check if the path sfmapp exists if not create a dir */
	checkAndCreateDir(path: string): Promise<boolean> {
		return Filesystem.readdir({
			path: path,
			directory: FilesystemDirectory.ExternalStorage
		}).then(_ => {
			return true;
		}).catch(_ => {
			return Filesystem.mkdir({
				path: path,
				directory: FilesystemDirectory.ExternalStorage,
				recursive: true
			}).then(_ => {
				return true;
			});
		});
	}

	/** read a file as base64 and save in the main folder of system */
	readAndSave(pathFile: string, pathToSave: string, fileName: string): Promise<string> {
		return Filesystem.readFile({
			path: pathFile,
		}).then(infoFile => {
			return Filesystem.writeFile({
				path: pathToSave + fileName,
				data: infoFile.data,
				directory: FilesystemDirectory.ExternalStorage,
				recursive: true
			}).then(result => {
				return result.uri;
			});
		});
	}

	/** Delete folder and files created on device */
	checkAndDeleteFile(path: string): Promise<boolean> {
		return Filesystem.readFile({
			path: path
		}).then(_ => {
			return Filesystem.deleteFile({
				path: path
			}).then(_ => {
				return true;
			});
		}).catch(_ => {
			return true;
		});
	}

	/** Check if dir exists */
	checkAndDeleteDir(path: string): Promise<RmdirResult> {
		return Filesystem.readdir({
			path: path,
			directory: FilesystemDirectory.ExternalStorage
		}).then(_ => {
			return Filesystem.rmdir({
				path: path,
				directory: FilesystemDirectory.ExternalStorage,
				recursive: true
			})
		})
	}

	/** Write a file */
	writeFile(path: string, filename: string, content: string): Promise<boolean> {
		return Filesystem.writeFile({
			path: path + filename,
			data: content,
			directory: FilesystemDirectory.ExternalStorage
		}).then(result => {
			if (result) {
				return true;
			} else {
				return false;
			}
		});
	}

	/** Read a file and returns a string base 64 */
	readFile(path: string): Promise<string> {
		return Filesystem.readFile({
			path: path
		}).then(result => {
			return result.data;
		});
	}

	/** Check if file name is valid. If not valid, return a new unique name instead. */
	validateNameFile(name: string): string {
		let extension: string = name.split('.').pop();
		if (name.match(/^[^\\/:\*\?"<>\|]+$/) || name.match(/^\./) || name.match(/^(nul|prn|con|lpt[0-9]|com[0-9])(\.|$)/i)) {
			let newName: string = new Date().valueOf().toString();
			return newName + '.' + extension;
		} else {
			return name;
		}
	}
}