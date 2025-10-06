import os
from http import HTTPStatus
from dashscope import Application
# 工作流和智能体编排应用自定义参数传递

biz_params = {"floor": "14"}
response = Application.call(
    # 若没有配置环境变量，可用百炼API Key将下行替换为：api_key="sk-xxx"。但不建议在生产环境中直接将API Key硬编码到代码中，以减少API Key泄露风险。
    api_key=os.getenv("DASHSCOPE_API_KEY"),
    app_id='c0cd2dd09f6f4dc7b40a12bf863a6614',  # 替换为实际的应用 ID
    prompt='https://image1.ljcdn.com/newhouse-user-image/4410b021a472539aa26e93eaec9cf192.jpg',
    biz_params=biz_params  # 传递业务参数
)

if response.status_code != HTTPStatus.OK:
    print(f'request_id={response.request_id}')
    print(f'code={response.status_code}')
    print(f'message={response.message}')
    print(f'请参考文档：https://help.aliyun.com/zh/model-studio/developer-reference/error-code')
else:
    print(f'{response.output.text}')  # 处理只输出文本text