export namespace main {
	
	export class Config {
	    audio_only: boolean;
	    video_format: string;
	    audio_format: string;
	    no_playlist: boolean;
	    dark_theme: boolean;
	    output_dir: string;
	    language: string;
	    save_history: boolean;
	    quality: string;
	
	    static createFrom(source: any = {}) {
	        return new Config(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.audio_only = source["audio_only"];
	        this.video_format = source["video_format"];
	        this.audio_format = source["audio_format"];
	        this.no_playlist = source["no_playlist"];
	        this.dark_theme = source["dark_theme"];
	        this.output_dir = source["output_dir"];
	        this.language = source["language"];
	        this.save_history = source["save_history"];
	        this.quality = source["quality"];
	    }
	}
	export class DownloadRequest {
	    url: string;
	    audio_only: boolean;
	    no_playlist: boolean;
	    format: string;
	    quality: string;
	    output_dir: string;
	
	    static createFrom(source: any = {}) {
	        return new DownloadRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.url = source["url"];
	        this.audio_only = source["audio_only"];
	        this.no_playlist = source["no_playlist"];
	        this.format = source["format"];
	        this.quality = source["quality"];
	        this.output_dir = source["output_dir"];
	    }
	}
	export class HistoryEntry {
	    title: string;
	    url: string;
	    format: string;
	    date: string;
	    audio_only: boolean;
	    duration: string;
	
	    static createFrom(source: any = {}) {
	        return new HistoryEntry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.title = source["title"];
	        this.url = source["url"];
	        this.format = source["format"];
	        this.date = source["date"];
	        this.audio_only = source["audio_only"];
	        this.duration = source["duration"];
	    }
	}

}

