import { RadioBrowserApi, StationSearchType } from 'radio-browser-api';

const globalForRadio = global as unknown as {
    radioApi: RadioBrowserApi;
}

const radio = globalForRadio.radioApi || new RadioBrowserApi("Blackjack Radio");

if (process.env.NODE_ENV !== "production") {
    globalForRadio.radioApi = radio;
}

export default radio;