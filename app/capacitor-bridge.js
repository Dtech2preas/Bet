import { Capacitor } from '@capacitor/core';
import { Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Browser } from '@capacitor/browser';
import { App } from '@capacitor/app';

window.Capacitor = Capacitor;
window.Capacitor.Plugins = {
    Filesystem,
    Share,
    Browser,
    App
};
