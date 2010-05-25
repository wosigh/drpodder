/*
This file is part of drPodder.

drPodder is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

drPodder is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with drPodder.  If not, see <http://www.gnu.org/licenses/>.

Copyright 2010 Jamie Hatfield <support@drpodder.com>
*/

function Player(audioObject) {
	this.audioObject = audioObject;
}

Player.prototype.getProgress = function() {
	var progress = {current: 0, remain: 0, duration: 0, currentPer: 0, progressStart: 0, progressEnd: 1};
	if (!isNaN(this.audioObject.currentTime) &&
		isFinite(this.audioObject.duration) && !isNaN(this.audioObject.duration) && this.audioObject.duration !== 0) {
		progress.current = this.audioObject.currentTime;
		progress.duration = this.audioObject.duration;
		progress.remain = progress.duration - progress.current;
		progress.currentPer = progress.current / progress.duration;
		if (!this.episodeObject.downloaded) {
			var buffered = this.audioObject.buffered;
			if (buffered !== undefined && buffered !== null) {
				// webOS 1.4 broke this
				//this.progressModel.progressStart = buffered.start(0)/this.audioObject.duration;
				//Mojo.Log.info("buffered.start(0)=%d", buffered.start(0));
				this.progressModel.progressStart = this.audioObject.currentTime/this.audioObject.duration;
				this.progressModel.progressEnd = buffered.end(0)/this.audioObject.duration;
			}
		}
	}
};
