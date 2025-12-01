import { atom } from 'recoil';

const applyMinWidthState = atom({
    key: 'applyMinWidthState',
    default: false,
});

const gridCurrentOffsetState = atom({
    key: 'gridCurrentOffsetState',
    default: false,
});

const gridColumnsState = atom({
    key: 'gridColumnsState',
    default: [],
});

const gridResponse = atom({
    key: 'gridResponse',
    default: [],
});

const downloadGridResponse = atom({
    key: 'downloadGridData',
    default: false,
});

const handleGridResponse = atom({
    key: 'handleGridResponse',
    default: false,
});

const scheduledDownloadgridResponse = atom({
    key: 'scheduledDownloadgridResponse',
    default: '',
});

const pendingDownloadGridResponse = atom({
    key: 'pendingDownloadGridResponse',
    default: false,
});

const appliedFilterURLState = atom({
    key: 'appliedFilterURLState',
    default: '',
});

const markUpState = atom({
    key: 'markUpState',
    default: '',
});

const recordsExceedState = atom({
    key: 'recordsExceedState',
    default: false,
});

export{
    applyMinWidthState,
    gridCurrentOffsetState,
    gridColumnsState,
    gridResponse,
    downloadGridResponse,
    handleGridResponse,
    scheduledDownloadgridResponse,
    pendingDownloadGridResponse,
    appliedFilterURLState,
    markUpState,
    recordsExceedState
}