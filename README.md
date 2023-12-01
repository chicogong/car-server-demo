# 应用云渲染后台 Demo

- zh [中文](README.md)
- en [English](README.en.md)

## 目录

- [应用云渲染后台 Demo](#应用云渲染后台-demo)
  - [目录](#目录)
  - [一键部署](#一键部署)
    - [1. 安装](#1-安装)
    - [2. 生成配置](#2-生成配置)
    - [3. 启动服务](#3-启动服务)
  - [容器部署](#容器部署)
    - [1. 主机环境自行安装 docker 服务](#1-主机环境自行安装-docker-服务)
    - [2. 生成镜像](#2-生成镜像)
    - [3. 开启容器实例](#3-开启容器实例)
  - [接口请求类型](#接口请求类型)
  - [接口文档](#接口文档)
    - [1. 启动应用](#1-启动应用)
    - [2. 结束应用](#2-结束应用)
    - [3. 用户加入队列](#3-用户加入队列)
    - [4. 用户退出队列](#4-用户退出队列)
  - [错误码定义](#错误码定义)

## 一键部署

### 1. 安装

下载源码后，进入源码目录，根据系统环境选择执行脚本

- Windows 使用 PowerShell 执行 install.ps1 脚本进行一键安装

- Unix/Linux 使用 bash 执行 install.sh 脚本进行一键安装

### 2. 生成配置

安装过程中需按照提示输入对应的参数以生成服务配置文件，可根据业务实际情况输入，支持的配置参数如下：

- SECRET_ID：腾讯云帐号的 SecretId，可在 [API 密钥管理](https://console.cloud.tencent.com/cam/capi) 中获取

- SECRET_KEY：腾讯云帐号的 SecretKey，可在 [API 密钥管理](https://console.cloud.tencent.com/cam/capi) 中获取

- API_SIGN：是否开启请求参数校验，默认为不开启，建议业务上线后开启请求参数校验保证数据安全

    如开启则需要填写签名混淆密钥 SALT，不开启则无需填写

- SALT：接口的签名 Key，注意保密。开启后请求参数需要增加 sign 参数，sign 根据 SALT 生成（sign 参数具体生成规则见下文）

- REDIS_QUEUE：是否开启 redis 队列存储方式，默认为不开启，使用内存队列存储，建议业务上线后开启 redis 队列存储实现多机部署

    如开启则需要填写 redis 服务地址和密码，不开启则无需填写

- REDIS：redis 服务连接地址

- REDIS_PWD：redis 服务密码，如果没有密码可为空

### 3. 启动服务

配置项输入完成后会自动启动服务，控制台如输出 car-server-demo@0.0.0 start 则表示启动成功

默认请求地址为 <http://ip:3000/xxx>

后续需要启动服务也可以在命令行下输入

```bash
npm run start
```

## 容器部署

### 1. 主机环境自行安装 docker 服务

### 2. 生成镜像

如需要免环境变量启动，执行

```bash
node install.js 
```

生成服务配置文件 config.json，再执行生成镜像

```bash
chmod 777 build.sh && ./build.sh
```

### 3. 开启容器实例

免环境变量启动：

```bash
docker run -d -p3000:3000 cgserver
```

使用环境变量输入参数（如已生成 config.json, 不需要再设置环境变量）：

```bash
docker run -d -p3000:3000 -e SECRET_KEY=xxx -e SECRET_ID=yyy cgserver
```

支持的环境变量如下：

- SECRET_ID：腾讯云帐号的 SecretId，可在 [API 密钥管理](https://console.cloud.tencent.com/cam/capi) 中获取

- SECRET_KEY：腾讯云帐号的 SecretKey，可在 [API 密钥管理](https://console.cloud.tencent.com/cam/capi) 中获取

- API_SIGN：是否开启请求参数校验，默认为不开启，建议业务上线后开启请求参数校验保证数据安全

    如开启则需要填写签名混淆密钥 SALT，不开启则无需填写

- SALT：接口的签名 Key，注意保密。开启后请求参数需要增加 sign 参数，sign 根据 SALT 生成（sign 参数具体生成规则见下文）

- REDIS_QUEUE：是否开启 redis 队列存储方式，默认为不开启，使用内存队列存储，建议业务上线后开启 redis 队列存储实现多机部署

    如开启则需要填写 redis 服务地址和密码，不开启则无需填写

- REDIS：redis 服务连接地址

- REDIS_PWD：redis 服务密码，如果没有密码可为空

- TRTC_SDKAPPID: 腾讯云音视频 SdkAppId
- 
- TRTC_SECRET_KEY: 腾讯云音视频 SecretKey

- SUD_APPID: Sud AppId

- SUD_APP_KEY: Sud App Key

- SUD_APP_SECRET: Sud App Secret


## 接口请求类型

- 请求方法：HTTP POST
- 数据类型：JSON
- 默认请求端口 3000，如需改为其他端口，修改 bin/www 里面的端口值并重启服务即可
- 控制台请求服务示例：

```bash
curl -X POST --data "ClientSession=xxx&RequestId=req123&UserId=userid123&ProjectId=cap-xxx&Sign=xxxx" http://127.0.0.1:3000/StartProject
```

## 接口文档

### 1. 启动应用

- 路径：```/StartProject```

- 描述：启动应用，直接调用此接口不会进入排队流程

- 请求

| 字段                 | 类型   | 必要           | 描述                                                                                                                                              |
| -------------------- | ------ | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| UserId               | string | 是             | 用户 ID，业务自定义生成，不同用户需要生成不同 UserId 来区分                                                                                       |
| ProjectId            | string | 是             | 项目 ID，应用云渲染项目创建时生成，[项目管理](https://console.cloud.tencent.com/car/project) 中获取，格式为 cap-xxx                               |
| ApplicationId        | string | 否             | 应用 ID，多应用共享项目请求时有效，应用云渲染应用创建时生成，[应用管理](https://console.cloud.tencent.com/car/application) 中获取，格式为 app-xxx |
| ApplicationVersionId | string | 否             | 应用版本 ID，应用云渲染应用创建时生成，[应用管理](https://console.cloud.tencent.com/car/application) 中获取，格式为 ver-xxx                       |
| ClientSession        | string | 是             | 客户端会话描述                                                                                                                                    |
| RequestId            | string | 否             | 请求 ID，业务自定义生成，可用于业务区分不同请求                                                                                                   |
| Sign                 | string | 开启校验则必要 | 请求校验参数<br>计算方式：SHA256(字段名排序后取字段值，并拼接成字符串，最后再拼接上签名混淆密钥 SALT)                                             |

- 响应

| 字段            | 类型   | 描述            |
| --------------- | ------ | --------------- |
| Code            | number | 返回码          |
| Msg             | string | 描述信息        |
| RequestId       | string | 业务请求 ID     |
| SessionDescribe | object | webrtc 会话信息 |

- SessionDescribe 结构

| 字段          | 类型   | 描述                         |
| ------------- | ------ | ---------------------------- |
| ServerSession | string | 服务端会话                   |
| RequestId     | string | 应用云渲染服务云 API 请求 ID |

### 2. 结束应用

- 路径：```/StopProject```

- 描述：主动释放云应用并发

- 请求

| 字段      | 类型   | 必要           | 描述                                                                                                  |
| --------- | ------ | -------------- | ----------------------------------------------------------------------------------------------------- |
| UserId    | string | 是             | 用户 ID，业务自定义生成，不同用户需要生成不同 UserId 来区分                                           |
| RequestId | string | 否             | 请求 ID，业务自定义生成，可用于业务区分不同请求                                                       |
| Sign      | string | 开启校验则必要 | 请求校验参数<br>计算方式：SHA256(字段名排序后取字段值，并拼接成字符串，最后再拼接上签名混淆密钥 SALT) |

- 响应

| 字段      | 类型   | 描述        |
| --------- | ------ | ----------- |
| Code      | number | 返回码      |
| Msg       | string | 描述信息    |
| RequestId | string | 业务请求 ID |

### 3. 用户加入队列

- 路径：```/Enqueue```

- 描述：加入排队，成功后会返回当前队列位置，当返回码为 10101 时代表排队完成，需要再调用 StartProject 进行应用启动

- 请求

| 字段                 | 类型   | 必要           | 描述                                                                                                                                              |
| -------------------- | ------ | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| UserId               | string | 是             | 用户 ID，业务自定义生成，不同用户需要生成不同 UserId 来区分                                                                                       |
| ProjectId            | string | 是             | 项目 ID，应用云渲染项目创建时生成，[项目管理](https://console.cloud.tencent.com/car/project) 中获取，格式为 cap-xxx                               |
| ApplicationId        | string | 否             | 应用 ID，多应用共享项目请求时有效，应用云渲染应用创建时生成，[应用管理](https://console.cloud.tencent.com/car/application) 中获取，格式为 app-xxx |
| ApplicationVersionId | string | 否             | 应用版本 ID，应用云渲染应用创建时生成，[应用管理](https://console.cloud.tencent.com/car/application) 中获取，格式为 ver-xxx                       |
| RequestId            | string | 否             | 请求 ID，业务自定义生成，可用于业务区分不同请求                                                                                                   |
| Sign                 | string | 开启校验则必要 | 请求校验参数<br>计算方式：SHA256(字段名排序后取字段值，并拼接成字符串，最后再拼接上签名混淆密钥 SALT)                                             |

- 响应

| 字段      | 类型   | 描述        |
| --------- | ------ | ----------- |
| Code      | number | 返回码      |
| Msg       | string | 描述信息    |
| RequestId | string | 业务请求 ID |
| Data      | object | 队列消息    |

- Data 结构
  
| 字段      | 类型   | 描述     |
| --------- | ------ | -------- |
| Index     | number | 队列序号 |
| UserId    | string | 用户 ID  |
| ProjectId | string | 项目 ID  |

### 4. 用户退出队列

- 路径：```/Dequeue```

- 描述：退出当前进行中的排队流程

- 请求

| 字段      | 类型   | 必要           | 描述                                                                                                  |
| --------- | ------ | -------------- | ----------------------------------------------------------------------------------------------------- |
| UserId    | string | 是             | 用户 ID，业务自定义生成，不同用户需要生成不同 UserId 来区分                                           |
| RequestId | string | 否             | 请求 ID，业务自定义生成，可用于业务区分不同请求                                                       |
| Sign      | string | 开启校验则必要 | 请求校验参数<br>计算方式：SHA256(字段名排序后取字段值，并拼接成字符串，最后再拼接上签名混淆密钥 SALT) |

- 响应

| 字段      | 类型   | 描述        |
| --------- | ------ | ----------- |
| Code      | number | 返回码      |
| Msg       | string | 描述信息    |
| RequestId | string | 业务请求 ID |

## 错误码定义

| Code  | 描述                                     |
| ----- | ---------------------------------------- |
| 0     | 请求成功                                 |
| 10000 | sign 校验错误                            |
| 10001 | 缺少必要参数                             |
| 10100 | 排队进行中，需要继续请求获取队列位置更新 |
| 10101 | 排队完成                                 |
| 10200 | 创建应用云渲染会话失败                   |
| 10201 | 释放应用云渲染会话失败                   |
| 10202 | 申请并发失败                             |
