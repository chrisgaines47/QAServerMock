class FileLocker {
    errorCallback(error) {
      console.log("Error in Locker.", error);
    }
  
    constructor() {
      return new Promise((resolve, reject) => {
        navigator.webkitPersistentStorage.requestQuota(5 * 1024 * 1024, grantedBytes =>
          window.webkitRequestFileSystem(PERSISTENT, grantedBytes,
            fs => {
                this.fs = fs;
                resolve(this);
            }
          ),
          reject
        );
      })
    }
  
    createDirectory(path) {
      return new Promise((resolve, reject) => {
        this.fs.root.getDirectory(
          path,
          { create: true },
          resolve,
          reject
        );
      });
    }

    removeDirectory(path) {
      return new Promise((resolve, reject) => {
        this.fs.root.getDirectory(
          path,
          {},
          dirEntry => dirEntry.removeRecursively(resolve, reject),
          reject
        );
      });
    }
  
    listDirectory(path) {
      return new Promise((resolve, reject) => {
        function listDir(directory) {
          var dir_reader = directory.createReader();
          var entries = [];
    
          let readEntries = function() {
            let readResults = function(results) {
              if (!results.length) resolve(entries);
              else {
                entries = entries.concat(
                  Array.prototype.slice.call(results || [], 0)
                );
                readEntries();
              }
            };
            dir_reader.readEntries(readResults, function() {});
          };
          readEntries();
        }

        this.fs.root.getDirectory(
          path,
          {},
          directory => listDir(directory),
          reject
        );
      });
    }

    findFile(path) {
      return new Promise((resolve, reject) => {
        this.listDirectory('/').then(entries => {
          var fileEntry = Array.prototype.slice.call(entries).find(entry => entry.fullPath === path);
          fileEntry ? resolve(fileEntry) : reject();
        });
      })
    }
  
    loadFile(path) {
      return new Promise((resolve, reject) => {
        this.findFile(path).then(fileEntry => {
          fileEntry.file(file => {
            var reader = new FileReader();
            reader.onloadend = function(e) {
              var data = this.result;
              resolve(data);
            };
            reader.readAsText(file);
          });
        }).catch(reject);
      })
    }
  
    saveFile(path, data) {
      var thisLocker = this;
      return new Promise((resolve, reject) => {
        function createFile(path, data) {
            thisLocker.fs.root.getFile(path, { create: true }, fileEntry => {
              fileEntry.createWriter(fw => {
                var blob = new Blob([data], { type: "text/plain" });
                fw.write(blob);
                resolve(fileEntry);
              });
            }, reject);
        };
        createFile(path, data);
      });
    }
  
    removeFile(path) {
      return new Promise((resolve, reject) => {
        this.findFile(path).then(fileEntry => {
          fileEntry.remove(resolve, reject);
        }).catch(reject)
      })
    }
  }