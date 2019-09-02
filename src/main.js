/**
 * Async promise-based queue class
 */
export default class AsyncQueue {
    /**
     * Queue
     *
     * @type {Array}
     * @private
     */
    _queue = null;

    /**
     * Timer id
     *
     * @type {Number|null}
     * @private
     */
    _timer = null;

    /**
     * Queue processing finish promise
     *
     * @type {Promise}
     * @private
     */
    _promise = null;

    /**
     * Queue
     *
     * @type {Function|null}
     * @private
     */
    _resolve = null;

    /**
     * Queue processing flag
     *
     * @type {boolean}
     * @private
     */
    _processing = false;

    /**
     * Queue processing break flag
     *
     * @type {boolean}
     * @private
     */
    _break = false;

    /**
     * Queue processing timeout
     *
     * @type {number}
     * @private
     */
    _timeout = 0;

    /**
     *
     * @type {Function|null}
     * @private
     */
    _callback = null;

    /**
     *
     * @return {Function}
     */
    get callback() {
        return this._callback;
    }

    /**
     *
     * @param {Function|null} value
     */
    set callback(value) {
        if (typeof(value) !== 'function' && value !== null)
            throw new Error('Callback value should be a function or null');
        this._callback = value;
    }

    /**
     * Queue length
     *
     * @return {number}
     */
    get length() {
        return this._queue.length;
    }

    /**
     * Queue processing finish promise
     *
     * @return {Promise}
     */
    get promise() {
        return this._promise;
    }

    /**
     * Queue processing flag
     *
     * @return {boolean}
     */
    get processing() {
        return this._processing;
    }

    /**
     * Queue processing timeout
     *
     * @return {number}
     */
    get timeout() {
        return this._timeout;
    }

    /**
     * Queue processing timeout
     *
     * @param {number} value
     */
    set timeout(value) {
        this._timeout = Math.round(Number(value));
    }

    /**
     *
     * @param {Function} callback
     * @param {number} timeout
     */
    constructor(callback = null, timeout = 0) {
        this._timeout = timeout;
        this.callback = callback;
        this._queue = [];
        this._promise = Promise.resolve();
    }

    /**
     * Adds an action to queue and starts queue processing if needed
     *
     * @param {Function} action
     * @return {Promise}
     */
    push(action) {
        return new Promise((resolve, reject) => {
            this._queue.push({ resolve: resolve, reject: reject, action: action });
            this._process();
        });
    }

    /**
     * Sets processing break flag
     */
    breakProcessing() {
        this._break = true;
    }

    /**
     * Finishes the queue processing and calls a callback function if exists
     *
     * @private
     */
    _finishProcessing() {
        if (typeof(this._resolve) === 'function')
            this._resolve();
        else
            this._promise = Promise.resolve();
        this._resolve = null;
        this._processing = false;
        this._break = false;
        if (typeof(this._callback) === 'function')
            this._callback();
    }

    /**
     * Processes queue
     *
     * @param {boolean} ignoreProcessingFlag
     * @return {Promise<void>}
     * @private
     */
    async _process(ignoreProcessingFlag = false) {
        if (!ignoreProcessingFlag && this._processing) return;
        else if (this._break) {
            for (let i = 0; i < this._queue.length; ++i)
                this._queue[i].reject();
            this._queue = [];
            this._finishProcessing();

            return;
        }

        const query = this._queue.shift();
        if (query === undefined) {
            this._finishProcessing();
            return;
        }

        this._processing = true;
        this._promise = new Promise(resolve => this._resolve = resolve);

        let result = null;
        try {
            result = await query.action();
        }
        catch (e) {
            query.reject(e);
        }

        query.resolve(result);

        this._timer = setTimeout(() => {
            this._timer = null;
            this._process(true);
        }, this._timeout);
    }
}
