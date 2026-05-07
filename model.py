import google.generativeai as genai

genai.configure(api_key="AIzaSyDhVK2Z2I6r0pYQMfNqEmZ4wuXXGxE8Mck")

for m in genai.list_models():
    print(m.name, "->", m.supported_generation_methods)