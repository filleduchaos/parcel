const {EventEmitter} = require('events');
const Farm = require('worker-farm/lib/farm');
const promisify = require('./utils/promisify');

let shared = null;

class WorkerFarm extends Farm {
  constructor(options) {
    let opts = {
      autoStart: true,
      maxConcurrentWorkers: require('physical-cpu-count')
    };

    super(opts, require.resolve('./worker'));

    this.localWorker = this.promisifyWorker(require('./worker'));
    this.remoteWorker = this.promisifyWorker(this.setup(['init', 'run']));

    this.started = false;

    this.localWorker.init(options);
    this.initRemoteWorkers(options);
  }

  promisifyWorker(worker) {
    let res = {};

    for (let key in worker) {
      res[key] = promisify(worker[key].bind(worker));
    }

    return res;
  }

  async initRemoteWorkers(options) {
    let promises = [];
    for (let i = 0; i < this.activeChildren; i++) {
      promises.push(this.remoteWorker.init(options));
    }

    await Promise.all(promises);
    this.started = true;
  }

  receive(data) {
    if (data.event) {
      this.emit(data.event, ...data.args);
    } else {
      super.receive(data);
    }
  }

  async run(...args) {
    // Child process workers are slow to start (~600ms).
    // While we're waiting, just run on the main thread.
    // This significantly speeds up startup time.
    if (!this.started) {
      return this.localWorker.run(...args);
    } else {
      return this.remoteWorker.run(...args);
    }
  }

  end() {
    super.end();
    shared = null;
  }

  static getShared(options) {
    if (!shared) {
      shared = new WorkerFarm(options);
    }

    return shared;
  }
}

for (let key in EventEmitter.prototype) {
  WorkerFarm.prototype[key] = EventEmitter.prototype[key];
}

module.exports = WorkerFarm;