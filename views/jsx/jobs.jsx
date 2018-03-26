var React = require('react');
var $ = require('jquery');
var moment = require('moment-timezone');
var hljs = require('highlight.js');
var isInteger = require('lodash/isInteger');
var isEqual = require('lodash/isEqual');

var Pagination = require('./pagination.jsx');

var isJsonObject = function(value) {
  if (value == undefined) return true;
  if (typeof value === "string" && value.length === 0) return true;

  var parsed;
  try {
    parsed = JSON.parse(value);
  }
  catch (e) {
    return false;
  }
  return parsed && typeof parsed === "object";
}

var Job = React.createClass({

  componentDidMount: function() {
    hljs.highlightBlock(this.refs.code.getDOMNode());
  },

  promoteJob: function() {
    var _this = this;
    if (confirm('Are you sure you want to promote this job?')) {
      $.post('job/promote/', {
        queue: this.props.queue,
        id: this.props.job.id
      }, function(response) {
        if (response.status === 'OK') {
          if (_this.props.onJobUpdate) {
            _this.props.onJobUpdate();
          }
        } else {
          console.log(response);
          alert(response.message);
        }
      });
    }
  },

  removeJob: function() {
    var _this = this;
    if (confirm('Are you sure you want to remove job ' + this.props.job.id + '? This action is not reversible.')) {
      $.post('job/remove/', {
        queue: this.props.queue,
        id: this.props.job.id
      }, function(response) {
        if (response.status === 'OK') {
          if (_this.props.onJobUpdate) {
            _this.props.onJobUpdate();
          }
        } else {
          console.log(response);
          alert(response.message);
        }
      });
    }
  },

  rerunJob: function() {
    var _this = this;
    if (confirm('Are you sure you want to rerun job ' + this.props.job.id + '? This will create another instance of the job with the same params and will be executed immediately.')) {
      $.post('job/rerun/', {
        queue: this.props.queue,
        id: this.props.job.id
      }, function(response) {
        if (response.status === 'OK') {
          if (_this.props.onJobUpdate) {
            _this.props.onJobUpdate();
          }
        } else {
          console.log(response);
          alert(response.message);
        }
      });
    }
  },

  render: function() {
    var _this = this;
    var job = this.props.job;
    try {
      if (typeof job.data === 'string') {
        job.data = JSON.parse(job.data);
      }
      if (typeof job.opts === 'string') {
        job.opts = JSON.parse(job.opts);
      }
    } catch (err) {
      console.log(err);
    }
    return (
      <div className="job clearfix" key={job.id}>
        <div className="job-details">
          <h4 className="job-id">Job ID: {job.id}</h4>
          <br />
          {
            this.props.showState ? (
              <h5 className={"job-state " + job.state}>{job.state[0].toUpperCase() + job.state.substring(1)}</h5>
            ) : ''
          }
          {
            (job.data && job.data.type && job.data._category) ? (
              <div>
                <p className="job-category">
                  {job.data._category} : {job.data.type}
                </p>
              </div>
            ) : ''
          }
          <p className="job-creation">Created At:
            <br/>
            {moment(job.timestamp).format('MM/DD/YYYY hh:mm:ssA')}
          </p>
          {
            job.state === 'delayed' ? (
              <div>
                <p className="job-delay">Delayed Until:
                  <br/>
                  {moment(job.timestamp + job.delay).format('MM/DD/YYYY hh:mm:ssA')}
                </p>
                {
                  _this.props.enablePromote && !_this.props.readonly ? (
                    <button className="job-promote btn btn-embossed btn-warning" onClick={_this.promoteJob}>Promote</button>
                  ) : ''
                }
                <br />
                <br />
              </div>
            ) : ''
          }
          {
            this.props.readonly || (job.state !== 'completed' && job.state !== 'failed') ? '' : (
              <div>
                <a className="job-rerun" href="javascript:;" onClick={this.rerunJob}>Rerun Job</a>
              </div>
            )
          }
          {
            this.props.readonly ? '' : (
              <div>
                <a className="job-remove" href="javascript:;" onClick={this.removeJob}>Remove Job</a>
              </div>
            )
          }
          <br />
          <br />
        </div>
        <pre className="job-code">
          <code ref="code" dangerouslySetInnerHTML={{__html: JSON.stringify(job, null, 2)}} />
        </pre>
      </div>
    );
  }

});

var AddJob = React.createClass({

  getInitialState: function() {
    var state = this.reset();
    return state;
  },

  handleChange: function(event) {
    this.state[event.target.name] = event.target.value;
    this.setState(this.state);
  },

  reset: function() {
    return {
      data: "",
      delayMillis: 1000, // 1 second
      attempts: 25,
      backoff: 5 * 60 * 1000, // 5 minutes
      backoffType: 'exponential',
      newJobId: null
    };
  },

  validate: function(event) {
    var canSubmit;
    switch (event.target.name) {
      case 'delayMillis':
      case 'attempts':
      case 'backoff':
        canSubmit = isInteger(parseInt(event.target.value, 10));
        break;
      case 'data':
        canSubmit = isJsonObject(event.target.value);
        break;
      case 'backoffType':
        canSubmit = event.target.value === 'exponential' || event.target.value === 'fixed';
        break;
      default:
        throw new Error("Unknown input type.");
    }
    if (canSubmit) {
      this.refs[event.target.name].classList.remove("has-error");
    } else {
      this.refs[event.target.name].classList.add("has-error");
    }
    this.forceUpdate();
  },

  isReadyToSubmit: function() {
    var _this = this;
    return Object.keys(this.refs).reduce(function(acc, elt) {
      return acc && !_this.refs[elt].classList.contains("has-error");
    }, true);
  },

  submit: function() {
    var data = this.state.data;
    var _this = this;
    if (data === undefined || data.length === 0) {
      data = {};
    } else {
      data = JSON.parse(data);
    }
    $.ajax({
        url: "queue/" + _this.props.queue + "/new",
        type: "POST",
        data: JSON.stringify({
          data: data,
          opts: {
            delay: _this.state.delayMillis,
            attempts: _this.state.attempts,
            backoff: {
              type: _this.state.backoffType,
              delay: _this.state.backoff
            }
          }
        }),
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        success: function(response) {
          if (response.status === 'OK') {
            var state = _this.reset();
            state.newJobId = response.jobId;
            _this.setState(state);
          } else {
            console.log(response);
            alert(response.message);
          }
        }
    });
  },

  render: function() {
    return (
      <div className="toureiro-jobs">
        <h4 className="header">New Job</h4>
        <div className="container-fluid">
          <div className="row job-top-buffer">
            <div ref="delayMillis" className="form-group col-xs-3">
              <label htmlFor="delayMillis">Delay Millis:</label>
              <input className="form-control" type="text" name="delayMillis" onBlur={this.validate} onChange={this.handleChange} value={this.state.delayMillis} />
            </div>
            <div ref="attempts" className="form-group col-xs-3">
              <label htmlFor="attempts">Attempts Limit:</label>
              <input className="form-control" type="text" name="attempts" onBlur={this.validate} onChange={this.handleChange} value={this.state.attempts} />
            </div>
            <div ref="backoff" className="form-group col-xs-3">
              <label htmlFor="backoff">Backoff Millis:</label>
              <input className="form-control" type="text" name="backoff" onBlur={this.validate} onChange={this.handleChange} value={this.state.backoff} />
            </div>
            <div ref="backoffType" className="form-group col-xs-3">
              <label htmlFor="backoffType">Backoff Type:</label>
              <select className="form-control" name="backoffType" onBlur={this.validate} onChange={this.handleChange}>
                <option value="exponential">exponential</option>
                <option value="fixed">fixed</option>
              </select>
            </div>
          </div>
          <div className="row job-top-buffer">
            <div ref="data" className="form-group col-xs-12">
              <label htmlFor="data">Job Data:</label>
              <textarea className="form-control" rows={10} name="data" onBlur={this.validate} onChange={this.handleChange} value={this.state.data} />
            </div>
          </div>
          <div className="row job-top-buffer">
            <div className="col-xs-12">
              { this.state.newJobId ? (<label className="col-xs-3">Created a new job with id: {this.state.newJobId}</label>) : '' }
              <button disabled={!this.isReadyToSubmit()} onClick={this.submit} className={"btn btn-success col-xs-3 " + (this.state.newJobId ? "col-xs-offset-6" : "col-xs-offset-9")}>Create</button>
            </div>
          </div>
        </div>
      </div>
    );
  }
});

var JobDetails = React.createClass({

  getInitialState: function() {
    var state = {
      id: undefined,
      job: undefined
    };
    return state;
  },

  handleJobSearch: function(event) {
    if (event.which === 13) {
      this.getJobById();
    }
  },

  getJobById: function() {
    var _this = this;
    var id = $(this.refs.idField.getDOMNode()).val()
    if (id) {
      $.get('job/', {
        queue: this.props.queue,
        id: id
      }, function(response) {
        if (response.status === 'OK') {
          _this.setState({
            id: id,
            job: response.job
          });
        } else {
          console.log(response);
          _this.setState({
            id: id,
            job: null
          });
        }
      });
    } else {
      this.setState({
        id: null,
        job: null
      });
    }
  },

  render: function() {
    return (
      <div className="toureiro-jobs">
        <h4 className="header">Job Details</h4>
        <div>
          <label>Find Job by ID: </label>
          <div className="input-group">
            <input ref="idField" className="form-control" type="text" name="id" onKeyUp={this.handleJobSearch} />
            <span className="input-group-btn">
              <button className="btn btn-success" onClick={this.getJobById}>Go</button>
            </span>
          </div>
        </div>
        <br />
        {
          (this.state.job) ? (
            <Job job={this.state.job} queue={this.props.queue} enablePromote={true} showState={true} readonly={this.props.readonly} />
          ) : (
            (this.state.id) ? (
              <span>Job is not found.</span>
            ) : ''
          )
        }
      </div>
    );
  }

});

var ToureiroJobs = React.createClass({

  getInitialState: function() {
    var state = {
      jobs: [],
      page: 0,
      limit: 15,
      total: 0
    };
    return state;
  },

  componentDidUpdate: function() {
    if (this.state.page !== this.refs.pagination.state.page) {
      this.refs.pagination.setState({
        page: this.state.page
      });
    }
  },

  fetchJobs: function() {
    var _this = this;
    this.setState({
      jobs: []
    }, function() {
      $.get('job/fetch/' + _this.props.category, {
        queue: _this.props.queue,
        page: _this.state.page,
        limit: _this.state.limit
      }, function(response) {
        if (response.status === 'OK') {
          if (response.jobs.length === 0 && response.total > 0) {
            _this.setState({
              page: 0
            }, function() {
              _this.fetchJobs();
            });
          } else {
            _this.setState({
              jobs: response.jobs,
              total: response.total
            });
          }
        } else {
          console.log(response);
        }
      });
    });
  },

  handlePageChange: function(page) {
    var _this = this;
    this.setState({
      page: page
    }, function() {
      _this.fetchJobs();
    });
  },

  handleJobUpdate: function() {
    this.fetchJobs();
  },

  render: function() {
    var _this = this;
    return (
      <div className="toureiro-jobs">
        <h4 className="header">{this.props.category[0].toUpperCase() + this.props.category.slice(1)} Jobs</h4>
        <div ref="jobs">
          {
            this.state.jobs.map(function(job) {
              return (
                <Job key={job.id} job={job} queue={_this.props.queue} onJobUpdate={_this.handleJobUpdate} enablePromote={_this.props.category === 'delayed'} readonly={_this.props.readonly} />
              );
            })
          }
        </div>
        <Pagination ref="pagination" total={Math.ceil(this.state.total / this.state.limit)} onPageChange={this.handlePageChange} />
      </div>
    );
  }

});

module.exports.JobDetails = JobDetails;
module.exports.Jobs = ToureiroJobs;
module.exports.AddJob = AddJob;
